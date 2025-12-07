import AsyncHandler from "express-async-handler";
import { AppResponse } from "../../utils/index.js";
import { Bot } from "../../models/Bot.js";
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

        // Get existing performance or initialize
        const performance = bot.performance || {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            totalProfit: 0,
            totalLoss: 0,
            netProfit: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            lastTradeAt: null,
            trades: []
        };

        // Extract profit from various possible sources
        const profit = tradeResult.profitLoss || tradeResult.profit || 0;

        // Update trade counts
        performance.totalTrades = (performance.totalTrades || 0) + 1;
        
        if (profit > 0) {
            performance.winningTrades = (performance.winningTrades || 0) + 1;
            performance.totalProfit = (performance.totalProfit || 0) + profit;
        } else if (profit < 0) {
            performance.losingTrades = (performance.losingTrades || 0) + 1;
            performance.totalLoss = (performance.totalLoss || 0) + Math.abs(profit);
        }

        // Calculate metrics
        if (performance.totalTrades > 0) {
            performance.winRate = (performance.winningTrades / performance.totalTrades) * 100;
        } else {
            performance.winRate = 0;
        }
        
        performance.netProfit = (performance.totalProfit || 0) - (performance.totalLoss || 0);
        performance.lastTradeAt = new Date();

        // Store trade history (keep last 100 trades)
        if (!Array.isArray(performance.trades)) {
            performance.trades = [];
        }

        // Add trade with metadata
        performance.trades.unshift({
            ...tradeResult,
            recordedAt: new Date()
        });

        // Keep only last 100 trades
        if (performance.trades.length > 100) {
            performance.trades = performance.trades.slice(0, 100);
        }

        // Update bot
        await bot.update({ performance });

        console.log(`[updateBotPerformance] Updated bot ${botId}:`, {
            totalTrades: performance.totalTrades,
            winRate: `${performance.winRate.toFixed(2)}%`,
            netProfit: performance.netProfit.toFixed(2)
        });

        return performance;

    } catch (error) {
        console.error(`[updateBotPerformance] Error updating bot ${botId}:`, error.message);
        // Don't re-throw to prevent trade execution from failing
        return null;
    }
};

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