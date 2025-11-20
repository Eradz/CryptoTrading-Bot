import AsyncHandler from "express-async-handler";
import { AppResponse } from "../../utils/index.js";
import { Bot } from "../../models/Bot.js";
import { AuthenticateExchange } from "../../utils/AuthenticateExchange.js";
import { TradingEngine } from "../../utils/trade/tradingEngine.js";

// Store active bot instances
const activeBots = new Map();

/**
 * Create a new trading bot
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
 */
export const updateBotPerformance = async (botId, tradeResult) => {
    try {
        const bot = await Bot.findByPk(botId);
        if (!bot) return;

        const performance = bot.performance;
        const profit = tradeResult.profit || 0;

        // Update trade counts
        performance.totalTrades += 1;
        if (profit > 0) {
            performance.winningTrades += 1;
            performance.totalProfit += profit;
        } else {
            performance.losingTrades += 1;
            performance.totalLoss += Math.abs(profit);
        }

        // Calculate metrics
        performance.winRate = (performance.winningTrades / performance.totalTrades) * 100;
        performance.netProfit = performance.totalProfit - performance.totalLoss;
        performance.lastTradeAt = new Date();

        // Store trade history (keep last 100 trades)
        performance.trades.unshift(tradeResult);
        if (performance.trades.length > 100) {
            performance.trades = performance.trades.slice(0, 100);
        }

        await bot.update({ performance });
    } catch (error) {
        console.error('Error updating bot performance:', error);
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