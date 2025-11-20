/**
 * Trade reconciliation worker
 * Runs every 5 minutes to sync trade status with exchange
 */
import { reconcileTrades } from '../trade/trade-reconciliation.js';
import { AuthenticateExchange } from '../AuthenticateExchange.js';
import {User} from '../../models/userModel.js';
import {Exchange} from '../../models/exchangeDetails.js';
import { logger } from '../monitoring/monitoring.js';

let reconciliationInterval = null;

export const startTradeReconciliationWorker = () => {
    // Run every 5 minutes
    const RECONCILIATION_INTERVAL = 5 * 60 * 1000;

    reconciliationInterval = setInterval(async () => {
        try {
            console.log(`[Trade Reconciliation] Starting worker at ${new Date().toISOString()}`);
            
            // Get all users with exchanges
            const users = await User.findAll();
            
            for (const user of users) {
                try {
                    // Get user's exchanges
                    const exchanges = await Exchange.findAll({
                        where: { userId: user.id }
                    });

                    for (const exchange of exchanges) {
                        try {
                            const authenticatedExchange = await AuthenticateExchange({
                                userId: user.id,
                                exchangeId: exchange.id
                            });

                            const reconciliationCount = await reconcileTrades(
                                authenticatedExchange,
                                user.id
                            );

                            logger.logTrade({
                                type: 'TRADE_RECONCILIATION',
                                userId: user.id,
                                exchangeId: exchange.id,
                                tradesReconciled: reconciliationCount
                            });
                        } catch (error) {
                            console.error(`[Trade Reconciliation] Error for exchange ${exchange.id}:`, error.message);
                            logger.logError(error, {
                                context: 'tradeReconciliationWorker',
                                userId: user.id,
                                exchangeId: exchange.id
                            });
                        }
                    }
                } catch (error) {
                    console.error(`[Trade Reconciliation] Error for user ${user.id}:`, error.message);
                    logger.logError(error, {
                        context: 'tradeReconciliationWorker',
                        userId: user.id
                    });
                }
            }

            console.log(`[Trade Reconciliation] Completed at ${new Date().toISOString()}`);
        } catch (error) {
            console.error('[Trade Reconciliation] Fatal error:', error);
            logger.logError(error, { context: 'tradeReconciliationWorker' });
        }
    }, RECONCILIATION_INTERVAL);

    console.log(`Trade reconciliation worker started (runs every ${RECONCILIATION_INTERVAL / 1000 / 60} minutes)`);
};

export const stopTradeReconciliationWorker = () => {
    if (reconciliationInterval) {
        clearInterval(reconciliationInterval);
        reconciliationInterval = null;
        console.log('Trade reconciliation worker stopped');
    }
};
