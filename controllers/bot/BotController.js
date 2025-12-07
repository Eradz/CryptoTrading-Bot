import AsyncHandler from "express-async-handler";
import { AppResponse } from "../../utils/index.js";
import { Bot } from "../../models/Bot.js";
import Trade from "../../models/Trade.js";
import { AuthenticateExchange } from "../../utils/AuthenticateExchange.js";
import { TradingEngine } from "../../utils/trade/tradingEngine.js";

// Store active bot instances
const activeBots = new Map();

/**
 * Bot Templates - Pre-configured with optimal defaults
 */
const BOT_TEMPLATES = {
    RSI_SMA_MACD: {
        name: "RSI + SMA + MACD Strategy",
        description: "Momentum-based strategy combining RSI overbought/oversold with SMA crossovers and MACD confirmation",
        strategy: "RSI_SMA_MACD",
        interval: "1h",
        parameters: {
            rsi: { period: 14, overbought: 70, oversold: 30 },
            sma: { shortPeriod: 20, longPeriod: 200 },
            macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
        },
        riskManagement: {
            riskPercentage: 1,
            riskRewardRatio: 2,
            maxPositionSize: 10000,
            maxRiskPerTrade: 2,
            stopLossPercentage: 2,
            takeProfitPercentage: 4
        },
        estimatedWinRate: "55-65%"
    },
    BOLLINGER_BANDS: {
        name: "Bollinger Bands Strategy",
        description: "Mean-reversion strategy using Bollinger Bands with volatility confirmation",
        strategy: "BOLLINGER_BANDS",
        interval: "1h",
        parameters: {
            bollinger: { period: 20, standardDev: 2 },
            rsi: { period: 14, overbought: 70, oversold: 30 }
        },
        riskManagement: {
            riskPercentage: 1,
            riskRewardRatio: 1.5,
            maxPositionSize: 5000,
            maxRiskPerTrade: 1.5,
            stopLossPercentage: 3,
            takeProfitPercentage: 4.5
        },
        estimatedWinRate: "50-60%"
    },
    HYBRID: {
        name: "Hybrid Multi-Strategy",
        description: "Conservative strategy combining multiple indicators with high confidence signals (Recommended for beginners)",
        strategy: "HYBRID",
        interval: "4h",
        parameters: {
            rsi: { period: 14, overbought: 70, oversold: 30 },
            sma: { shortPeriod: 20, longPeriod: 200 },
            macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
            bollinger: { period: 20, standardDev: 2 }
        },
        riskManagement: {
            riskPercentage: 0.5,
            riskRewardRatio: 3,
            maxPositionSize: 8000,
            maxRiskPerTrade: 1,
            stopLossPercentage: 1.5,
            takeProfitPercentage: 4.5
        },
        estimatedWinRate: "65-75%"
    }
};

/**
 * Create a new trading bot with full configuration
 */
export const createBotController = AsyncHandler(async (req, res) => {
    const { name, strategy, symbol, interval, parameters, riskManagement } = req.body;
    const userId = req.params.userId;
    const exchangeId = req.params.exchangeId;

    if (!userId || !exchangeId) {
        return AppResponse.error(res, "User ID and Exchange ID are required");
    }

    if (!name || !strategy || !symbol) {
        return AppResponse.error(res, "Name, strategy, and symbol are required");
    }

    try {
        // Validate exchange exists
        await AuthenticateExchange({ userId, exchangeId });

        const bot = await Bot.create({
            userId,
            exchangeId,
            name,
            strategy,
            symbol,
            interval: interval || '1h',
            parameters: parameters || undefined,
            riskManagement: riskManagement || undefined,
            isActive: false
        });

        return AppResponse.success(res, "Bot created successfully", bot);
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
});

/**
 * Create a trading bot with simplified one-click template selection
 * User selects bot type and it's auto-configured with optimal defaults
 */
export const createBotFromTemplateController = AsyncHandler(async (req, res) => {
    const { botType, symbol, name } = req.body;
    const userId = req.params.userId;
    const exchangeId = req.params.exchangeId;

    // Validate inputs
    if (!userId || !exchangeId) {
        return AppResponse.error(res, "User ID and Exchange ID are required", 400);
    }

    if (!botType || !symbol) {
        return AppResponse.error(res, "Bot type and symbol are required", 400);
    }

    // Validate bot type is in templates
    if (!BOT_TEMPLATES[botType]) {
        const validTypes = Object.keys(BOT_TEMPLATES);
        return AppResponse.error(res, `Invalid bot type. Valid options: ${validTypes.join(', ')}`, 400);
    }

    // Validate symbol format
    if (!/^[A-Z]+\/[A-Z]+$/.test(symbol)) {
        return AppResponse.error(res, "Symbol must be in format like BTC/USDT", 400);
    }

    try {
        // Validate exchange exists
        await AuthenticateExchange({ userId, exchangeId });

        // Get template
        const template = BOT_TEMPLATES[botType];

        // Create bot with template configuration
        const botName = name || `${template.name} - ${symbol}`;
        
        const bot = await Bot.create({
            userId,
            exchangeId,
            name: botName,
            strategy: template.strategy,
            symbol,
            interval: template.interval,
            parameters: template.parameters,
            riskManagement: template.riskManagement,
            isActive: false
        });

        return AppResponse.success(res, "Bot created successfully with template configuration", {
            bot,
            template: {
                description: template.description,
                estimatedWinRate: template.estimatedWinRate
            },
            status: "Bot created and ready to activate"
        }, 201);
    } catch (error) {
        return AppResponse.error(res, error.message, 500);
    }
});

/**
 * Get available bot templates
 */
export const getBotTemplatesController = AsyncHandler(async (req, res) => {
    try {
        const templates = Object.entries(BOT_TEMPLATES).map(([key, value]) => ({
            id: key,
            name: value.name,
            description: value.description,
            strategy: value.strategy,
            interval: value.interval,
            estimatedWinRate: value.estimatedWinRate,
            riskProfile: value.riskManagement.riskPercentage <= 0.5 ? 'Conservative' : 
                        value.riskManagement.riskPercentage === 1 ? 'Moderate' : 'Aggressive'
        }));

        return AppResponse.success(res, "Bot templates retrieved successfully", templates);
    } catch (error) {
        return AppResponse.error(res, error.message, 500);
    }
});

/**
 * Get all bots for a user
 */
export const getUserBotsController = AsyncHandler(async (req, res) => {
    const userId = req.params.userId;

    if (!userId) {
        return AppResponse.error(res, "User ID is required");
    }

    try {
        const bots = await Bot.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });

        return AppResponse.success(res, "Bots retrieved successfully", bots);
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
});

/**
 * Get single bot by ID
 */
export const getBotByIdController = AsyncHandler(async (req, res) => {
    const { botId } = req.params;

    if (!botId) {
        return AppResponse.error(res, "Bot ID is required");
    }

    try {
        const bot = await Bot.findByPk(botId);

        if (!bot) {
            return AppResponse.error(res, "Bot not found");
        }

        return AppResponse.success(res, "Bot retrieved successfully", bot);
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
});

/**
 * Update bot configuration
 */
export const updateBotController = AsyncHandler(async (req, res) => {
    const { botId } = req.params;
    const updates = req.body;

    if (!botId) {
        return AppResponse.error(res, "Bot ID is required");
    }

    try {
        const bot = await Bot.findByPk(botId);

        if (!bot) {
            return AppResponse.error(res, "Bot not found");
        }

        if (bot.isActive) {
            return AppResponse.error(res, "Cannot update active bot. Stop it first.");
        }

        // Update allowed fields
        const allowedUpdates = ['name', 'strategy', 'symbol', 'interval', 'parameters', 'riskManagement'];
        const filteredUpdates = {};
        
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        });

        await bot.update(filteredUpdates);

        return AppResponse.success(res, "Bot updated successfully", bot);
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
});

/**
 * Start a trading bot
 */
export const startBotController = AsyncHandler(async (req, res) => {
    const { botId } = req.params;

    if (!botId) {
        return AppResponse.error(res, "Bot ID is required");
    }

    const bot = await Bot.findByPk(botId);
    try {
        if (!bot) {
            return AppResponse.error(res, "Bot not found");
        }

        if (bot.isActive) {
            return AppResponse.error(res, "Bot is already running");
        }

        // Authenticate exchange
        const exchange = await AuthenticateExchange({
            userId: bot.userId,
            exchangeId: bot.exchangeId
        });

        // Create trading engine instance
        const tradingEngine = new TradingEngine(exchange, bot);
        
        // Start the bot
        await tradingEngine.start();

        // Store instance
        activeBots.set(botId, tradingEngine);

        // Update bot status
        await bot.update({ isActive: true, lastError: null });

        return AppResponse.success(res, "Bot started successfully", bot);
    } catch (error) {
        await Bot.update(
            { lastError: error.message, errorCount: bot.errorCount + 1 },
            { where: { id: botId } }
        );
        return AppResponse.error(res, error.message);
    }
});

/**
 * Stop a trading bot
 */
export const stopBotController = AsyncHandler(async (req, res) => {
    const { botId } = req.params;

    if (!botId) {
        return AppResponse.error(res, "Bot ID is required");
    }

    try {
        const bot = await Bot.findByPk(botId);

        if (!bot) {
            return AppResponse.error(res, "Bot not found");
        }

        if (!bot.isActive) {
            return AppResponse.error(res, "Bot is not running");
        }

        // Get trading engine instance
        const tradingEngine = activeBots.get(botId);
        
        if (tradingEngine) {
            await tradingEngine.stop();
            activeBots.delete(botId);
        }

        // Update bot status
        await bot.update({ isActive: false });

        return AppResponse.success(res, "Bot stopped successfully", bot);
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
});

/**
 * Delete a trading bot
 */
export const deleteBotController = AsyncHandler(async (req, res) => {
    const { botId } = req.params;

    if (!botId) {
        return AppResponse.error(res, "Bot ID is required");
    }

    try {
        const bot = await Bot.findByPk(botId);

        if (!bot) {
            return AppResponse.error(res, "Bot not found");
        }

        if (bot.isActive) {
            // Stop bot first
            const tradingEngine = activeBots.get(botId);
            if (tradingEngine) {
                await tradingEngine.stop();
                activeBots.delete(botId);
            }
        }

        await bot.destroy();

        return AppResponse.success(res, "Bot deleted successfully");
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
});

/**
 * Get bot performance
 */
export const getBotPerformanceController = AsyncHandler(async (req, res) => {
    const { botId } = req.params;

    if (!botId) {
        return AppResponse.error(res, "Bot ID is required");
    }

    try {
        const bot = await Bot.findByPk(botId);

        if (!bot) {
            return AppResponse.error(res, "Bot not found");
        }

        return AppResponse.success(res, "Performance retrieved successfully", bot.performance);
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
});

/**
 * Update bot performance after trade
 * IMPORTANT: This function is called after a trade is executed to update the bot's performance metrics
 */
export const updateBotPerformance = async (botId, tradeResult) => {
    try {
        const bot = await Bot.findByPk(botId);
        if (!bot) {
            console.warn(`[updateBotPerformance] Bot ${botId} not found`);
            return null;
        }

            // Get existing performance or initialize (ensure openTrades present)
            const performance = bot.performance || {};
            performance.totalTrades = performance.totalTrades || 0;
            performance.openTrades = performance.openTrades || 0;
            performance.winningTrades = performance.winningTrades || 0;
            performance.losingTrades = performance.losingTrades || 0;
            performance.winRate = performance.winRate || 0;
            performance.totalProfit = performance.totalProfit || 0;
            performance.totalLoss = performance.totalLoss || 0;
            performance.netProfit = performance.netProfit || 0;
            performance.maxDrawdown = performance.maxDrawdown || 0;
            performance.sharpeRatio = performance.sharpeRatio || 0;
            performance.lastTradeAt = performance.lastTradeAt || null;
            if (!Array.isArray(performance.trades)) performance.trades = [];

            // Normalize incoming trade data
            const profit = tradeResult.profitLoss ?? tradeResult.profit ?? null;
            const status = tradeResult.status || (profit !== null ? 'filled' : 'open');
            const tradeId = tradeResult.id || tradeResult.exchangeOrderId || null;

            // Try to find existing trade in history
            const existingIndex = performance.trades.findIndex(t => (t.id && tradeId && t.id === tradeId) || (t.exchangeOrderId && tradeId && t.exchangeOrderId === tradeId));

            if (existingIndex >= 0) {
                // Update existing trade entry
                const existing = performance.trades[existingIndex];
                const prevStatus = existing.status || 'open';

                // Replace/merge the entry
                performance.trades[existingIndex] = {
                    ...existing,
                    ...tradeResult,
                    recordedAt: new Date()
                };

                // Handle status transition open -> filled
                if (prevStatus !== 'filled' && status === 'filled') {
                    // Decrement openTrades if present
                    performance.openTrades = Math.max(0, (performance.openTrades || 0) - 1);

                    // Increment filled trade counters
                    performance.totalTrades = (performance.totalTrades || 0) + 1;
                    if (profit > 0) {
                        performance.winningTrades = (performance.winningTrades || 0) + 1;
                        performance.totalProfit = (performance.totalProfit || 0) + profit;
                    } else if (profit < 0) {
                        performance.losingTrades = (performance.losingTrades || 0) + 1;
                        performance.totalLoss = (performance.totalLoss || 0) + Math.abs(profit);
                    }
                    performance.lastTradeAt = tradeResult.filledAt ? new Date(tradeResult.filledAt) : new Date();
                }
            } else {
                // New trade - insert at front
                performance.trades.unshift({
                    ...tradeResult,
                    recordedAt: new Date()
                });

                if (status === 'filled') {
                    // Filled trade - counts toward completed trades
                    performance.totalTrades = (performance.totalTrades || 0) + 1;
                    if (profit > 0) {
                        performance.winningTrades = (performance.winningTrades || 0) + 1;
                        performance.totalProfit = (performance.totalProfit || 0) + profit;
                    } else if (profit < 0) {
                        performance.losingTrades = (performance.losingTrades || 0) + 1;
                        performance.totalLoss = (performance.totalLoss || 0) + Math.abs(profit);
                    }
                    performance.lastTradeAt = tradeResult.filledAt ? new Date(tradeResult.filledAt) : new Date();
                } else {
                    // Open/pending trade - count as open
                    performance.openTrades = (performance.openTrades || 0) + 1;
                }
            }

            // Keep only last 100 trades in history
            if (performance.trades.length > 100) {
                performance.trades = performance.trades.slice(0, 100);
            }

            // Recalculate derived metrics (based on filled trades only)
            if (performance.totalTrades > 0) {
                performance.winRate = (performance.winningTrades / performance.totalTrades) * 100;
            } else {
                performance.winRate = 0;
            }

            performance.netProfit = (performance.totalProfit || 0) - (performance.totalLoss || 0);

            // Persist
            await bot.update({ performance });

            console.log(`[updateBotPerformance] Updated bot ${botId}: totalTrades=${performance.totalTrades}, openTrades=${performance.openTrades}, winRate=${performance.winRate.toFixed(2)}%, netProfit=${(performance.netProfit || 0).toFixed(2)}`);

            return performance;

    } catch (error) {
        console.error(`[updateBotPerformance] Error updating bot ${botId}:`, error.message);
        // Don't re-throw to prevent trade execution from failing
        return null;
    }
};

/**
 * Stop all active bots globally
 * Cancels all open trades and updates bot statuses
 */
export const stopAllBotsController = AsyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return AppResponse.error(res, "User ID is required");
    }

    try {
        // Get all active bots for this user
        const activeBotsList = await Bot.findAll({
            where: {
                userId,
                isActive: true
            }
        });

        if (activeBotsList.length === 0) {
            return AppResponse.success(res, "No active bots to stop", {
                botsStoppedCount: 0,
                tradesCancelledCount: 0,
                summary: "No active bots found"
            });
        }

        let totalTradesCancelled = 0;
        const results = [];

        // Process each active bot
        for (const bot of activeBotsList) {
            try {
                // Get all open trades for this bot
                const openTrades = await Trade.findAll({
                    where: {
                        strategyId: bot.id,
                        status: ['open', 'pending', 'partially_filled']
                    }
                });

                // Cancel each trade with the exchange
                for (const trade of openTrades) {
                    try {
                        if (trade.exchangeOrderId) {
                            // Authenticate with exchange to cancel order
                            const exchange = await AuthenticateExchange({ userId, exchangeId: bot.exchangeId });
                            
                            // Cancel the order on exchange
                            await exchange.cancelOrder(trade.exchangeOrderId, trade.symbol);
                            console.log(`[stopAllBots] Cancelled exchange order ${trade.exchangeOrderId} for bot ${bot.id}`);
                        }

                        // Update trade status to cancelled
                        await trade.update({
                            status: 'cancelled',
                            closedAt: new Date(),
                            notes: (trade.notes || '') + `\nCancelled via stopAllBots at ${new Date().toISOString()}`
                        });

                        totalTradesCancelled++;
                    } catch (tradeError) {
                        console.error(`[stopAllBots] Error cancelling trade ${trade.id}:`, tradeError.message);
                        // Continue with other trades even if one fails
                    }
                }

                // Stop the TradingEngine if active
                const engine = activeBots.get(bot.id);
                if (engine) {
                    try {
                        await engine.stop();
                        activeBots.delete(bot.id);
                        console.log(`[stopAllBots] Stopped trading engine for bot ${bot.id}`);
                    } catch (engineError) {
                        console.error(`[stopAllBots] Error stopping engine for bot ${bot.id}:`, engineError.message);
                    }
                }

                // Update bot status
                await bot.update({
                    isActive: false,
                    lastError: 'Bot stopped by user',
                    stoppedAt: new Date()
                });

                // Update performance - mark all open trades as cancelled
                const performance = bot.performance || {};
                performance.openTrades = Math.max(0, (performance.openTrades || 0) - openTrades.length);
                await bot.update({ performance });

                results.push({
                    botId: bot.id,
                    botName: bot.name,
                    tradesCancelled: openTrades.length,
                    status: 'stopped'
                });

                console.log(`[stopAllBots] Stopped bot ${bot.id} (${bot.name}), cancelled ${openTrades.length} trades`);
            } catch (botError) {
                console.error(`[stopAllBots] Error stopping bot ${bot.id}:`, botError.message);
                results.push({
                    botId: bot.id,
                    botName: bot.name,
                    error: botError.message,
                    status: 'error'
                });
            }
        }

        return AppResponse.success(res, "All bots stopped successfully", {
            botsStoppedCount: activeBotsList.length,
            tradesCancelledCount: totalTradesCancelled,
            details: results,
            summary: `Stopped ${activeBotsList.length} bot(s) and cancelled ${totalTradesCancelled} trade(s)`
        });
    } catch (error) {
        console.error('[stopAllBots] Error:', error.message);
        return AppResponse.error(res, error.message);
    }
});

/**
 * Stop an individual bot
 * Cancels its open trades and updates bot status
 */
export const stopIndividualBotController = AsyncHandler(async (req, res) => {
    const { botId, userId } = req.params;

    if (!botId || !userId) {
        return AppResponse.error(res, "Bot ID and User ID are required");
    }

    try {
        // Get the bot
        const bot = await Bot.findByPk(botId);

        if (!bot) {
            return AppResponse.error(res, "Bot not found", 404);
        }

        if (bot.userId !== parseInt(userId)) {
            return AppResponse.error(res, "Unauthorized - bot does not belong to user", 403);
        }

        if (!bot.isActive) {
            return AppResponse.success(res, "Bot is already inactive", {
                botId: bot.id,
                botName: bot.name,
                status: 'already_inactive',
                tradesCancelledCount: 0
            });
        }

        // Get all open trades for this bot
        const openTrades = await Trade.findAll({
            where: {
                strategyId: botId,
                status: ['open', 'pending', 'partially_filled']
            }
        });

        let tradesCancelled = 0;
        const cancelledTrades = [];

        // Cancel each open trade with the exchange
        for (const trade of openTrades) {
            try {
                if (trade.exchangeOrderId) {
                    // Authenticate with exchange to cancel order
                    const exchange = await AuthenticateExchange({ userId, exchangeId: bot.exchangeId });
                    
                    // Cancel the order on exchange
                    await exchange.cancelOrder(trade.exchangeOrderId, trade.symbol);
                    console.log(`[stopIndividualBot] Cancelled exchange order ${trade.exchangeOrderId} for bot ${botId}`);
                }

                // Update trade status to cancelled
                await trade.update({
                    status: 'cancelled',
                    closedAt: new Date(),
                    notes: (trade.notes || '') + `\nCancelled via stopIndividualBot at ${new Date().toISOString()}`
                });

                tradesCancelled++;
                cancelledTrades.push({
                    tradeId: trade.id,
                    exchangeOrderId: trade.exchangeOrderId,
                    symbol: trade.symbol,
                    side: trade.side,
                    quantity: trade.quantity
                });
            } catch (tradeError) {
                console.error(`[stopIndividualBot] Error cancelling trade ${trade.id}:`, tradeError.message);
                // Continue with other trades even if one fails
            }
        }

        // Stop the TradingEngine if active
        const engine = activeBots.get(botId);
        if (engine) {
            try {
                await engine.stop();
                activeBots.delete(botId);
                console.log(`[stopIndividualBot] Stopped trading engine for bot ${botId}`);
            } catch (engineError) {
                console.error(`[stopIndividualBot] Error stopping engine for bot ${botId}:`, engineError.message);
            }
        }

        // Update bot status
        await bot.update({
            isActive: false,
            lastError: 'Bot stopped by user',
            stoppedAt: new Date()
        });

        // Update performance - mark open trades as cancelled
        const performance = bot.performance || {};
        performance.openTrades = Math.max(0, (performance.openTrades || 0) - openTrades.length);
        await bot.update({ performance });

        console.log(`[stopIndividualBot] Stopped bot ${botId}, cancelled ${tradesCancelled} trades`);

        return AppResponse.success(res, "Bot stopped successfully", {
            botId: bot.id,
            botName: bot.name,
            status: 'stopped',
            tradesCancelledCount: tradesCancelled,
            cancelledTrades,
            summary: `Stopped bot "${bot.name}" and cancelled ${tradesCancelled} open trade(s)`
        });
    } catch (error) {
        console.error(`[stopIndividualBot] Error:`, error.message);
        return AppResponse.error(res, error.message);
    }
});

// Cleanup on server shutdown
export const shutdownAllBots = async () => {
    console.log('Shutting down all active bots...');
    for (const [botId, engine] of activeBots.entries()) {
        try {
            await engine.stop();
            await Bot.update({ isActive: false }, { where: { id: botId } });
        } catch (error) {
            console.error(`Error stopping bot ${botId}:`, error);
        }
    }
    activeBots.clear();
};