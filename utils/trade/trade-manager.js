import { trade } from './trade.js';
import { updateBotPerformance } from '../../controllers/bot/BotController.js';
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
        // Fetch current best bid/ask for validation
        let extraParams = {};
        const ticker = await exchangeClient.fetchTicker(symbol);
        const bestAsk = ticker.ask;
        const bestBid = ticker.bid;
        const minDistancePercent = 0.01; // 1%
        const minStopDistance = price * minDistancePercent;
        console.log(`[TRADE PARAMS] Entry: ${price}, StopLoss: ${stopLoss}, TakeProfit: ${takeProfit}, Side: ${side}, BestAsk: ${bestAsk}, BestBid: ${bestBid}`);

        // STOP_LOSS_LIMIT and TAKE_PROFIT_LIMIT validation
        if (type === 'STOP_LOSS_LIMIT' || type === 'TAKE_PROFIT_LIMIT') {
            if (side === 'sell') {
                // stopPrice must be below best bid
                if (stopLoss < bestBid) {
                    extraParams.stopLossPrice = stopLoss;
                } else {
                    const adjustedStop = bestBid - minStopDistance;
                    extraParams.stopLossPrice = adjustedStop;
                    console.warn(`[TRADE WARNING] Adjusted stopLossPrice from ${stopLoss} to ${adjustedStop} (must be < bestBid)`);
                }
            } else if (side === 'buy') {
                // stopPrice must be above best ask
                if (stopLoss > bestAsk) {
                    extraParams.stopLossPrice = stopLoss;
                } else {
                    const adjustedStop = bestAsk + minStopDistance;
                    extraParams.stopLossPrice = adjustedStop;
                    console.warn(`[TRADE WARNING] Adjusted stopLossPrice from ${stopLoss} to ${adjustedStop} (must be > bestAsk)`);
                }
            }
            // Take profit logic (similar, but usually not immediately triggerable)
            extraParams.takeProfitPrice = takeProfit;
        }

        // LIMIT_MAKER validation
        if (type === 'LIMIT_MAKER') {
            if (side === 'buy') {
                // price must be below best ask
                if (price < bestAsk) {
                    // valid
                } else {
                    const adjustedPrice = bestAsk - minStopDistance;
                    console.warn(`[TRADE WARNING] Adjusted LIMIT_MAKER price from ${price} to ${adjustedPrice} (must be < bestAsk)`);
                    tradeParams.price = adjustedPrice;
                }
            } else if (side === 'sell') {
                // price must be above best bid
                if (price > bestBid) {
                    // valid
                } else {
                    const adjustedPrice = bestBid + minStopDistance;
                    console.warn(`[TRADE WARNING] Adjusted LIMIT_MAKER price from ${price} to ${adjustedPrice} (must be > bestBid)`);
                    tradeParams.price = adjustedPrice;
                }
            }
        }

        // For other types, keep previous min distance logic
        if (type !== 'STOP_LOSS_LIMIT' && type !== 'TAKE_PROFIT_LIMIT' && type !== 'LIMIT_MAKER') {
            if (side === 'buy') {
                if (stopLoss < price - minStopDistance) {
                    extraParams.stopLossPrice = stopLoss;
                } else {
                    const adjustedStop = price - minStopDistance;
                    extraParams.stopLossPrice = adjustedStop;
                    console.warn(`[TRADE WARNING] Adjusted stopLossPrice from ${stopLoss} to ${adjustedStop} (min distance)`);
                }
                if (takeProfit > price + minStopDistance) {
                    extraParams.takeProfitPrice = takeProfit;
                } else {
                    const adjustedTake = price + minStopDistance;
                    extraParams.takeProfitPrice = adjustedTake;
                    console.warn(`[TRADE WARNING] Adjusted takeProfitPrice from ${takeProfit} to ${adjustedTake} (min distance)`);
                }
            } else if (side === 'sell') {
                if (stopLoss > price + minStopDistance) {
                    extraParams.stopLossPrice = stopLoss;
                } else {
                    const adjustedStop = price + minStopDistance;
                    extraParams.stopLossPrice = adjustedStop;
                    console.warn(`[TRADE WARNING] Adjusted stopLossPrice from ${stopLoss} to ${adjustedStop} (min distance)`);
                }
                if (takeProfit < price - minStopDistance) {
                    extraParams.takeProfitPrice = takeProfit;
                } else {
                    const adjustedTake = price - minStopDistance;
                    extraParams.takeProfitPrice = adjustedTake;
                    console.warn(`[TRADE WARNING] Adjusted takeProfitPrice from ${takeProfit} to ${adjustedTake} (min distance)`);
                }
            }
        }

        // Execute main trade with retry logic and circuit breaker
        let mainOrder;
        try {
            if (circuitBreaker) {
                console.log(extraParams, price)
                mainOrder = await circuitBreaker.execute(async () => {
                    return await retryWithBackoff(
                        () => trade(
                            symbol,
                            side,
                            positionSize,
                            exchangeClient,
                            type,
                            price,
                            extraParams
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
                console.log(extraParams, price)
                mainOrder = await trade(
                    symbol,
                    side,
                    positionSize,
                    exchangeClient,
                    type,
                    price,
                    extraParams
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

            // Update bot performance immediately (preliminary)
            try {
                await updateBotPerformance(strategyId, {
                    id: tradeRecord.id,
                    exchangeOrderId: tradeRecord.exchangeOrderId,
                    userId: tradeRecord.userId,
                    strategyId: tradeRecord.strategyId,
                    symbol: tradeRecord.symbol,
                    side: tradeRecord.side,
                    status: tradeRecord.status,
                    quantity: tradeRecord.quantity,
                    price: tradeRecord.price,
                    avgExecutedPrice: tradeRecord.avgExecutedPrice,
                    stopLoss: tradeRecord.stopLoss,
                    takeProfit: tradeRecord.takeProfit,
                    timestamp: tradeRecord.createdAt
                });
            } catch (err) {
                console.warn('Failed to update bot performance after trade creation:', err?.message || err);
            }
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