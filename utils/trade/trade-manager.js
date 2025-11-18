import { trade } from './trade.js';
import Trade from '../../models/Trade.js';
import { retryWithBackoff, exchangeCircuitBreakers } from '../resilience/retryHandler.js';
import { 
    calculatePositionSize, 
    calculateStopLoss, 
    calculateTakeProfit, 
    validateTradeRisk 
} from '../risk-management/position-manager.js';

/**
 * Execute trade with risk management and order tracking
 * @param {Object} exchangeClient - Authenticated exchange client
 * @param {Object} tradeParams - Trade parameters
 * @param {Object} riskParams - Risk management parameters
 * @param {Object} userContext - User context with userId, strategyId
 * @returns {Object} Trade result with order ID
 */
export const executeTradeWithRisk = async (exchangeClient, tradeParams, riskParams, userContext = {}) => {
    try {
        const {
            symbol,
            side,
            type = 'market',
            price
        } = tradeParams;

        const {
            accountBalance,
            riskPercentage,
            riskRewardRatio,
            maxPositionSize,
            maxRiskPerTrade
        } = riskParams;

        const { userId, strategyId } = userContext;

        // Calculate stop loss
        const stopLoss = calculateStopLoss(side, price, riskPercentage);

        console.log("stopLoss:", stopLoss);
        // Calculate position size
        const positionSize = calculatePositionSize(
            accountBalance,
            riskPercentage,
            price,
            stopLoss
        );
        console.log("Position Size:", positionSize);
        // Calculate take profit
        const takeProfit = calculateTakeProfit(
            side,
            price,
            stopLoss,
            riskRewardRatio
        );
        console.log("Take Profit:", takeProfit);
        // Validate trade risk
        const isValidTrade = validateTradeRisk(
            {
                positionSize,
                entryPrice: price,
                stopLoss,
                side
            },
            {
                maxPositionSize,
                maxRiskPerTrade,
                balance: accountBalance
            }
        );

        if (!isValidTrade) {
            throw new Error('Trade does not meet risk management criteria');
        }

        // Get circuit breaker for this exchange
        const exchangeName = exchangeClient.id || 'unknown';
        const circuitBreaker = exchangeCircuitBreakers[exchangeName];
        console.log("Circuit Breaker:", circuitBreaker);
        console.log("Exchange:", exchangeName);
        // Execute main trade with retry logic and circuit breaker
        let mainOrder;
        
        try {
            if (circuitBreaker) {
                mainOrder = await circuitBreaker.execute(async () => {
                    return await retryWithBackoff(
                        () => trade(
                            symbol,
                            side,
                            positionSize,
                            exchangeClient,
                            type,
                            price
                        ),
                        {
                            maxRetries: 3,
                            initialDelay: 1000,
                            shouldRetry: (error) => {
                                // Don't retry on invalid orders
                                if (error.message.includes('Invalid order')) return false;
                                // Retry on network/timeout errors
                                return error.message.includes('timeout') || 
                                       error.message.includes('ECONNREFUSED') ||
                                       error.code === 'ETIMEDOUT';
                            }
                        }
                    );
                });
            } else {
                mainOrder = await trade(
                    symbol,
                    side,
                    positionSize,
                    exchangeClient,
                    type,
                    price
                );
            }
        } catch (error) {
            // Save failed order to database
            if (userId) {
                await Trade.create({
                    exchangeOrderId: 'FAILED_' + Date.now(),
                    userId,
                    strategyId,
                    symbol,
                    side,
                    status: 'failed',
                    quantity: positionSize,
                    price,
                    stopLoss,
                    takeProfit,
                    riskPercentage,
                    riskRewardRatio,
                    notes: error.message
                });
            }
            throw error;
        }

        // Save order to database
        let tradeRecord = null;
        if (userId && mainOrder.id) {
            tradeRecord = await Trade.create({
                exchangeOrderId: mainOrder.id,
                userId,
                strategyId,
                symbol,
                side,
                status: mainOrder.status || 'open',
                quantity: positionSize,
                executedQty: mainOrder.filled || 0,
                price,
                avgExecutedPrice: mainOrder.average,
                cost: mainOrder.cost,
                fee: mainOrder.fee?.cost || 0,
                feeCurrency: mainOrder.fee?.currency || 'USDT',
                stopLoss,
                takeProfit,
                riskPercentage,
                riskRewardRatio,
                filledAt: mainOrder.timestamp ? new Date(mainOrder.timestamp) : null,
                exchangeResponse: mainOrder
            });
        }

        return {
            mainOrder,
            tradeRecord,
            positionSize,
            entryPrice: price,
            stopLoss,
            takeProfit,
            status: 'success'
        };

    } catch (error) {
        console.error('Error executing trade with risk management:', error);
        throw error;
    }
};