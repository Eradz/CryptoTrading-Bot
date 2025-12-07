/**
 * Bot Performance Sync Worker
 * 
 * Periodically syncs bot performance metrics from Trade records to Bot model
 * This ensures performance data is always accurate and up-to-date
 * 
 * Runs every 30 seconds to catch recent trades
 */

import { Bot } from '../../models/Bot.js';
import Trade from '../../models/Trade.js';
import { logger } from '../monitoring/monitoring.js';

/**
 * Calculate performance metrics from trades
 */
export const calculateBotPerformanceFromTrades = async (botId) => {
    try {
        // Get bot
        const bot = await Bot.findByPk(botId);
        if (!bot) {
            throw new Error(`Bot ${botId} not found`);
        }

        // Get all trades for this bot (we'll compute stats using filled trades)
        const trades = await Trade.findAll({
            where: {
                strategyId: botId
            },
            order: [['createdAt', 'ASC']],
            raw: true
        });

        // If you have a direct relationship, use this instead:
        // const trades = await bot.getTrades({ where: { status: 'filled' } });

        if (!trades || trades.length === 0) {
            return {
                totalTrades: 0,
                winningTrades: 0,
                losingTrades: 0,
                winRate: 0,
                totalProfit: 0,
                totalLoss: 0,
                netProfit: 0,
                maxDrawdown: 0,
                sharpeRatio: 0,
                lastTradeAt: bot.performance.lastTradeAt,
                trades: []
            };
        }

        // Only consider filled trades for P&L statistics
        const filledTrades = trades.filter(t => t.status === 'filled');
        const winningTrades = filledTrades.filter(t => (t.profitLoss || 0) > 0);
        const losingTrades = filledTrades.filter(t => (t.profitLoss || 0) < 0);

        const totalProfit = filledTrades
            .filter(t => (t.profitLoss || 0) > 0)
            .reduce((sum, t) => sum + (t.profitLoss || 0), 0);

        const totalLoss = Math.abs(
            filledTrades
                .filter(t => (t.profitLoss || 0) < 0)
                .reduce((sum, t) => sum + (t.profitLoss || 0), 0)
        );

        const netProfit = totalProfit - totalLoss;
        const winRate = filledTrades.length > 0 
            ? (winningTrades.length / filledTrades.length) * 100 
            : 0;

        // Calculate max drawdown
        let peak = 0;
        let maxDrawdown = 0;
        let runningProfit = 0;

        for (const trade of filledTrades) {
            runningProfit += trade.profitLoss || 0;
            if (runningProfit > peak) {
                peak = runningProfit;
            }
            const drawdown = peak - runningProfit;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }

        // Calculate Sharpe Ratio
    const returns = filledTrades.map(t => t.profitLoss || 0);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev !== 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

        // Get last 100 trades for history
        const recentTrades = trades.slice(-100).map(t => ({
            id: t.id,
            symbol: t.symbol,
            side: t.side,
            quantity: t.quantity,
            price: t.price,
            profitLoss: t.profitLoss,
            profitLossPercent: t.profitLossPercent,
            createdAt: t.createdAt
        }));

        // Get most recent trade date
        const lastTrade = trades[trades.length - 1];
        const lastTradeAt = lastTrade?.filledAt || lastTrade?.createdAt;

        return {
            totalTrades: trades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate,
            totalProfit,
            totalLoss,
            netProfit,
            maxDrawdown,
            sharpeRatio,
            lastTradeAt,
            trades: recentTrades
        };

    } catch (error) {
        logger.logError(error, {
            context: 'calculateBotPerformanceFromTrades',
            botId
        });
        throw error;
    }
};

/**
 * Update bot performance in database
 */
export const syncBotPerformance = async (botId) => {
    try {
        const bot = await Bot.findByPk(botId);
        if (!bot) {
            return null;
        }

        // Calculate latest metrics
        const performance = await calculateBotPerformanceFromTrades(botId);

        // Update bot with new performance
        await bot.update({ performance });

        logger.logTrade({
            type: 'BOT_PERFORMANCE_SYNCED',
            botId,
            performance
        });

        return performance;

    } catch (error) {
        logger.logError(error, {
            context: 'syncBotPerformance',
            botId
        });
    }
};

/**
 * Sync performance for all active bots
 */
export const syncAllBotPerformances = async () => {
    try {
        // Get all active bots
        const activeBots = await Bot.findAll({
            where: { isActive: true }
        });

        console.log(`[Bot Performance Sync] Syncing ${activeBots.length} active bots`);

        // Sync each bot's performance
        for (const bot of activeBots) {
            try {
                await syncBotPerformance(bot.id);
            } catch (error) {
                console.error(`[Bot Performance Sync] Error syncing bot ${bot.id}:`, error.message);
            }
        }

        console.log('[Bot Performance Sync] Completed');

    } catch (error) {
        console.error('[Bot Performance Sync] Fatal error:', error);
    }
};

/**
 * Start the bot performance sync worker
 * Runs every 30 seconds to keep performance metrics up-to-date
 */
export const startBotPerformanceSyncWorker = (intervalSeconds = 30) => {
    console.log(`[Bot Performance Sync] Started with ${intervalSeconds}s interval`);

    setInterval(async () => {
        try {
            await syncAllBotPerformances();
        } catch (error) {
            console.error('[Bot Performance Sync] Worker error:', error);
        }
    }, intervalSeconds * 1000);
};

/**
 * Manual sync for a specific bot
 * Useful for immediate updates after trades
 */
export const syncBotPerformanceImmediate = async (botId) => {
    return await syncBotPerformance(botId);
};
