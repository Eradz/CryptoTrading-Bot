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
import { Bot } from '../../models/Bot.js';

/**
 * Execute trade with risk management and order tracking
 * @param {Object} exchangeClient - Authenticated exchange client
 * @param {Object} tradeParams - Trade parameters
 * @param {Object} riskParams - Risk management parameters
 * @param {Object} userContext - User context with userId, botId
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

        const { userId, botId, bot } = userContext;

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

        // Fetch current ticker for validation
        const ticker = await exchangeClient.fetchTicker(symbol);
        const currentPrice = ticker.last || ticker.close;
        console.log(`[TRADE PARAMS] Entry: ${price}, StopLoss: ${stopLoss}, TakeProfit: ${takeProfit}, Side: ${side}, Current: ${currentPrice}`);

        // Validate stop-loss and take-profit prices
        if (side === 'buy') {
            // LONG position validation
            if (stopLoss >= currentPrice) {
                throw new Error(`Invalid LONG: Stop-loss (${stopLoss}) must be below current price (${currentPrice})`);
            }
            if (takeProfit <= currentPrice) {
                throw new Error(`Invalid LONG: Take-profit (${takeProfit}) must be above current price (${currentPrice})`);
            }
        } else if (side === 'sell') {
            // SHORT position validation
            if (stopLoss <= currentPrice) {
                throw new Error(`Invalid SHORT: Stop-loss (${stopLoss}) must be above current price (${currentPrice})`);
            }
            if (takeProfit >= currentPrice) {
                throw new Error(`Invalid SHORT: Take-profit (${takeProfit}) must be below current price (${currentPrice})`);
            }
        }

        // Execute main entry trade with retry logic and circuit breaker
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
                            price,
                            {} // No extra params for entry order
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
                    price,
                    {}
                );
            }

            console.log('✅ Entry order filled:', mainOrder.id);

            // Get actual fill price (important for calculating accurate SL/TP)
            const actualEntryPrice = mainOrder.average || mainOrder.price || price;
            console.log(`Actual entry price: ${actualEntryPrice}`);

            // Recalculate SL/TP based on actual entry price if significantly different
            let finalStopLoss = stopLoss;
            let finalTakeProfit = takeProfit;

            const priceDiffPercent = Math.abs((actualEntryPrice - price) / price * 100);
            if (priceDiffPercent > 0.5) { // If entry differs by more than 0.5%
                console.log(`⚠️ Entry price differs by ${priceDiffPercent.toFixed(2)}%, recalculating SL/TP`);
                finalStopLoss = calculateStopLoss(side, actualEntryPrice, riskPercentage);
                finalTakeProfit = calculateTakeProfit(side, actualEntryPrice, finalStopLoss, riskRewardRatio);
                console.log(`Adjusted - StopLoss: ${finalStopLoss}, TakeProfit: ${finalTakeProfit}`);
            }

            // Determine closing side (opposite of entry)
            const closingSide = side === 'buy' ? 'sell' : 'buy';

            // Place stop-loss and take-profit orders simultaneously
            let stopLossOrder = null;
            let takeProfitOrder = null;

            try {
                [stopLossOrder, takeProfitOrder] = await Promise.all([
                    // Stop-loss order
                    exchangeClient.createOrder(
                        symbol,
                        'stop_market',
                        closingSide,
                        positionSize,
                        null,
                        {
                            stopPrice: finalStopLoss,
                            reduceOnly: true // Only closes position, doesn't open new one
                        }
                    ),
                    // Take-profit order
                    exchangeClient.createOrder(
                        symbol,
                        'take_profit_market',
                        closingSide,
                        positionSize,
                        null,
                        {
                            stopPrice: finalTakeProfit,
                            reduceOnly: true
                        }
                    )
                ]);

                console.log('✅ Stop-loss placed:', stopLossOrder.id);
                console.log('✅ Take-profit placed:', takeProfitOrder.id);

            } catch (slTpError) {
                console.error('❌ Failed to place SL/TP:', slTpError.message);
                console.warn('⚠️ Position is OPEN without protection!');

                // Save entry trade with error flag
                if (userId && botId) {
                    await Trade.create({
                        exchangeOrderId: mainOrder.id,
                        botId: bot.id,
                        side,
                        status: "open",
                        price: actualEntryPrice,
                        quantity: positionSize,
                        stopLoss: finalStopLoss,
                        takeProfit: finalTakeProfit,
                        // error: `SL/TP placement failed: ${slTpError.message}`,
                        closedAt: 0
                    });
                }

                // Emergency: close position or alert
                throw new Error(`Entry filled but SL/TP failed: ${slTpError.message}. Position at risk!`);
            }

            // Save successful trade to database
            let tradeRecord = null;
            if (userId && botId) {
                tradeRecord = await Trade.create({
                    exchangeOrderId: mainOrder.id,
                    stopLossOrderId: stopLossOrder?.id,
                    takeProfitOrderId: takeProfitOrder?.id,
                    botId: bot.id,
                    side,
                    status: "open",
                    price: actualEntryPrice,
                    quantity: positionSize,
                    stopLoss: finalStopLoss,
                    takeProfit: finalTakeProfit,
                    closedAt: 0
                });

                console.log('✅ Trade record saved:', tradeRecord.id);
            }

            return {
                mainOrder,
                stopLossOrder,
                takeProfitOrder,
                tradeRecord,
                status: 'success',
                prices: {
                    entry: actualEntryPrice,
                    stopLoss: finalStopLoss,
                    takeProfit: finalTakeProfit
                }
            };

        } catch (error) {
            // Save failed order to database
            if (userId && botId) {
                await Trade.create({
                    exchangeOrderId: mainOrder?.id || 'FAILED_' + Date.now(),
                    botId: bot.id,
                    symbol,
                    side,
                    status: 'failed',
                    quantity: positionSize,
                    price,
                    stopLoss,
                    takeProfit,
                    // error: error.message
                });
            }
            throw error;
        }

    } catch (error) {
        console.error('Error executing trade with risk management:', error);
        throw error;
    }
};