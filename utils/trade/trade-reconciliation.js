import Trade from '../../models/Trade.js';
import { retryWithBackoff } from '../resilience/retryHandler.js';

/**
 * Reconcile trades with exchange to detect fills, partial fills, and cancellations
 * Run this periodically (every 5-10 minutes) to keep trade status updated
 */
export const reconcileTrades = async (exchangeClient, userId) => {
    try {
        console.log(`[Reconciliation] Starting trade reconciliation for user ${userId}`);

        // Get all open trades for this user
        const openTrades = await Trade.findAll({
            where: {
                userId,
                status: ['open', 'partially_filled', 'pending']
            }
        });

        if (openTrades.length === 0) {
            console.log(`[Reconciliation] No open trades to reconcile`);
            return;
        }

        // Fetch current order statuses from exchange
        const exchangeOrders = await retryWithBackoff(
            () => exchangeClient.fetchOrders(),
            {
                maxRetries: 2,
                initialDelay: 500,
                onRetry: ({ attempt }) => console.log(`[Reconciliation] Retry attempt ${attempt + 1}`)
            }
        );

        // Map exchange orders by ID for quick lookup
        const exchangeOrderMap = new Map(
            exchangeOrders.map(order => [order.id, order])
        );

        // Update each open trade with latest info
        for (const trade of openTrades) {
            try {
                const exchangeOrder = exchangeOrderMap.get(trade.exchangeOrderId);

                if (!exchangeOrder) {
                    console.log(`[Reconciliation] Order ${trade.exchangeOrderId} not found on exchange`);
                    continue;
                }

                // Update trade with latest info
                const oldStatus = trade.status;
                const newStatus = getTradeStatus(exchangeOrder);
                const executedQty = exchangeOrder.filled || 0;
                const avgPrice = exchangeOrder.average || trade.price;

                if (oldStatus !== newStatus || trade.executedQty !== executedQty) {
                    await trade.update({
                        status: newStatus,
                        executedQty,
                        avgExecutedPrice: avgPrice,
                        cost: executedQty * avgPrice,
                        exchangeResponse: exchangeOrder,
                        filledAt: newStatus === 'filled' ? new Date() : trade.filledAt
                    });

                    console.log(`[Reconciliation] Updated order ${trade.exchangeOrderId}: ${oldStatus} -> ${newStatus}, filled: ${executedQty}/${trade.quantity}`);
                }
            } catch (error) {
                console.error(`[Reconciliation] Error updating trade ${trade.exchangeOrderId}:`, error.message);
            }
        }

        console.log(`[Reconciliation] Completed for user ${userId}`);
        return openTrades.length;

    } catch (error) {
        console.error('[Reconciliation] Fatal error:', error);
        throw error;
    }
};

/**
 * Get standardized trade status from exchange order status
 */
function getTradeStatus(exchangeOrder) {
    const status = exchangeOrder.status?.toLowerCase();
    const filled = exchangeOrder.filled || 0;
    const amount = exchangeOrder.amount || 0;

    if (status === 'closed' || status === 'done') {
        return filled >= amount ? 'filled' : 'partially_filled';
    } else if (status === 'canceled' || status === 'cancelled') {
        return 'cancelled';
    } else if (status === 'open') {
        return filled > 0 ? 'partially_filled' : 'open';
    }

    return 'pending';
}

/**
 * Calculate realized profit/loss for closed positions
 */
export const updateTradeProfit = async (tradeId) => {
    try {
        const trade = await Trade.findByPk(tradeId);

        if (!trade || trade.status !== 'filled') {
            return null;
        }

        // Find matching sell order for buy trades (or vice versa)
        const matchingTrade = await Trade.findOne({
            where: {
                userId: trade.userId,
                symbol: trade.symbol,
                side: trade.side === 'buy' ? 'sell' : 'buy',
                status: 'filled',
                createdAt: { [sequelize.Op.gt]: trade.createdAt }
            },
            order: [['createdAt', 'ASC']],
            limit: 1
        });

        if (!matchingTrade) {
            return null;
        }

        // Calculate P&L
        const entryPrice = trade.avgExecutedPrice || trade.price;
        const exitPrice = matchingTrade.avgExecutedPrice || matchingTrade.price;
        const quantity = Math.min(trade.executedQty, matchingTrade.executedQty);

        const profitLoss = trade.side === 'buy'
            ? (exitPrice - entryPrice) * quantity
            : (entryPrice - exitPrice) * quantity;

        const profitLossPercent = (profitLoss / (entryPrice * quantity)) * 100;

        // Update both trades with profit/loss
        await trade.update({
            profitLoss,
            profitLossPercent,
            closedAt: matchingTrade.createdAt
        });

        await matchingTrade.update({
            profitLoss: -profitLoss, // Negative for closing trade
            profitLossPercent: -profitLossPercent
        });

        return {
            profitLoss,
            profitLossPercent,
            quantity,
            entryPrice,
            exitPrice
        };

    } catch (error) {
        console.error('Error calculating trade profit:', error);
        throw error;
    }
};

/**
 * Get trade statistics for performance tracking
 */
export const getTradeStatistics = async (userId, strategyId = null) => {
    try {
        const where = { userId, status: 'filled' };
        if (strategyId) where.strategyId = strategyId;

        const trades = await Trade.findAll({ where });

        const buyTrades = trades.filter(t => t.side === 'buy');
        const sellTrades = trades.filter(t => t.side === 'sell');

        const winningTrades = trades.filter(t => t.profitLoss > 0);
        const losingTrades = trades.filter(t => t.profitLoss < 0);

        const totalProfit = trades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
        const totalFees = trades.reduce((sum, t) => sum + (t.fee || 0), 0);

        return {
            totalTrades: trades.length,
            buyTrades: buyTrades.length,
            sellTrades: sellTrades.length,
            winningTrades: winningTrades.length,
            losingTrades: losingTrades.length,
            winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
            averageWin: winningTrades.length > 0 
                ? winningTrades.reduce((sum, t) => sum + t.profitLoss, 0) / winningTrades.length 
                : 0,
            averageLoss: losingTrades.length > 0 
                ? losingTrades.reduce((sum, t) => sum + t.profitLoss, 0) / losingTrades.length 
                : 0,
            totalProfit,
            totalFees,
            netProfit: totalProfit - totalFees,
            profitFactor: losingTrades.length > 0 
                ? Math.abs(winningTrades.reduce((sum, t) => sum + t.profitLoss, 0) / 
                           losingTrades.reduce((sum, t) => sum + t.profitLoss, 0))
                : 0
        };
    } catch (error) {
        console.error('Error calculating trade statistics:', error);
        throw error;
    }
};
