import { RSI_SMA_MACD_COLLABStrategies } from '../strategies/RSI/RSIstrategy.js';
import { startBollingerBands } from '../strategies/bollingerbands/start-bollinger-bands.js';
import { logger, alerts } from '../monitoring/monitoring.js';

import { RSI_SMA_MACD_COLLABStrategies } from '../strategies/RSI/RSIstrategy.js';
import { startBollingerBands } from '../strategies/bollingerbands/start-bollinger-bands.js';
import { logger, alerts } from '../monitoring/monitoring.js';

const createStrategyManager = (exchangeClient) => {
    const activeStrategies = new Map();
    const strategyConfigs = new Map();
    const strategyPerformance = new Map();

    const validateStrategyConfig = (config) => {
        const { type, symbol, params, interval } = config;

        if (!type || !symbol || !params) {
            throw new Error('Invalid strategy configuration');
        }

        // Validate based on strategy type
        switch (type.toLowerCase()) {
            case 'rsi':
                if (!params.period || !params.overbought || !params.oversold) {
                    throw new Error('Invalid RSI parameters');
                }
                break;
            case 'bollinger':
                if (!params.period || !params.standardDev) {
                    throw new Error('Invalid Bollinger Bands parameters');
                }
                break;
            default:
                throw new Error(`Unknown strategy type: ${type}`);
        }
    };

    const registerStrategy = async (strategyId, config) => {
        try {
            validateStrategyConfig(config);
            strategyConfigs.set(strategyId, config);

            // Initialize performance tracking
            strategyPerformance.set(strategyId, {
                trades: [],
                winRate: 0,
                profitLoss: 0,
                lastUpdated: new Date()
            });

            logger.logTrade({
                type: 'STRATEGY_REGISTERED',
                strategyId,
                config
            });

            return true;
        } catch (error) {
            logger.logError(error, { context: 'registerStrategy', strategyId });
            throw error;
        }
    };

    const startStrategy = async (strategyId) => {
        try {
            const config = strategyConfigs.get(strategyId);
            if (!config) {
                throw new Error(`Strategy ${strategyId} not registered`);
            }

            const { type, symbol, params, interval } = config;

            let strategyInstance;
            switch (type.toLowerCase()) {
                case 'rsi':
                    strategyInstance = RSI_SMA_MACD_COLLABStrategies(symbol, params);
                    break;
                case 'bollinger':
                    strategyInstance = await startBollingerBands(
                        strategyId,
                        interval,
                        symbol,
                        params.period,
                        params.standardDev,
                        exchangeClient.apiKey,
                        exchangeClient.secret,
                        params.amount
                    );
                    break;
                default:
                    throw new Error(`Unknown strategy type: ${type}`);
            }

            activeStrategies.set(strategyId, strategyInstance);
            alerts.strategyAlert(strategyId, 'STARTED');
            return true;
        } catch (error) {
            logger.logError(error, { context: 'startStrategy', strategyId });
            throw error;
        }
    };

    const stopStrategy = async (strategyId) => {
        try {
            const strategy = activeStrategies.get(strategyId);
            if (!strategy) {
                throw new Error(`Strategy ${strategyId} not active`);
            }

            if (typeof strategy.cleanup === 'function') {
                await strategy.cleanup();
            }

            activeStrategies.delete(strategyId);
            alerts.strategyAlert(strategyId, 'STOPPED');
            return true;
        } catch (error) {
            logger.logError(error, { context: 'stopStrategy', strategyId });
            throw error;
        }
    };

    const updateStrategy = async (strategyId, newConfig) => {
        try {
            if (activeStrategies.has(strategyId)) {
                await stopStrategy(strategyId);
            }

            const currentConfig = strategyConfigs.get(strategyId);
            strategyConfigs.set(strategyId, {
                ...currentConfig,
                ...newConfig
            });

            await startStrategy(strategyId);
            return true;
        } catch (error) {
            logger.logError(error, { context: 'updateStrategy', strategyId });
            throw error;
        }
    };

    const getStrategyPerformance = (strategyId) => {
        return strategyPerformance.get(strategyId);
    };

    const updateStrategyPerformance = (strategyId, tradeResult) => {
        const performance = strategyPerformance.get(strategyId);
        if (!performance) return;

        performance.trades.push(tradeResult);
        
        const winningTrades = performance.trades.filter(t => t.profit > 0).length;
        performance.winRate = (winningTrades / performance.trades.length) * 100;
        performance.profitLoss += tradeResult.profit;
        performance.lastUpdated = new Date();

        strategyPerformance.set(strategyId, performance);
    };

    return {
        registerStrategy,
        startStrategy,
        stopStrategy,
        updateStrategy,
        getStrategyPerformance,
        updateStrategyPerformance,
        getActiveStrategies: () => new Map(activeStrategies),
        getStrategyConfigs: () => new Map(strategyConfigs)
    };
};

export { createStrategyManager };