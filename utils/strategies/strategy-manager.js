import { RSIStrategy } from '../strategies/RSI/RSIStrategy.class.js';
import { startBollingerBands } from '../strategies/bollingerbands/start-bollinger-bands.js';
import { logger, alerts } from '../monitoring/monitoring.js';
import Strategy from '../../models/strategy.js';

const createStrategyManager = (exchangeClient) => {
    // Keep active strategies in memory for performance
    const activeStrategies = new Map();

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
            
            await Strategy.create({
                id: strategyId,
                type: config.type,
                symbol: config.symbol,
                params: config.params,
                interval: config.interval,
                status: 'stopped',
                performance: {
                    trades: [],
                    winRate: 0,
                    profitLoss: 0,
                    lastUpdated: new Date()
                }
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
            const strategy = await Strategy.findByPk(strategyId);
            if (!strategy) {
                throw new Error(`Strategy ${strategyId} not registered`);
            }

            const { type, symbol, params, interval } = strategy;

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
            await strategy.update({ status: 'active' });
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
            await Strategy.update(
                { status: 'stopped' },
                { where: { id: strategyId } }
            );
            alerts.strategyAlert(strategyId, 'STOPPED');
            return true;
        } catch (error) {
            logger.logError(error, { context: 'stopStrategy', strategyId });
            throw error;
        }
    };

    const updateStrategy = async (strategyId, newConfig) => {
        try {
            const strategy = await Strategy.findByPk(strategyId);
            if (!strategy) {
                throw new Error(`Strategy ${strategyId} not found`);
            }

            if (activeStrategies.has(strategyId)) {
                await stopStrategy(strategyId);
            }

            const updatedConfig = {
                ...strategy.get(),
                ...newConfig
            };
            validateStrategyConfig(updatedConfig);

            await strategy.update(newConfig);
            await startStrategy(strategyId);
            return true;
        } catch (error) {
            logger.logError(error, { context: 'updateStrategy', strategyId });
            throw error;
        }
    };

    const getStrategyPerformance = async (strategyId) => {
        const strategy = await Strategy.findByPk(strategyId);
        return strategy ? strategy.performance : null;
    };

    const updateStrategyPerformance = async (strategyId, tradeResult) => {
        const strategy = await Strategy.findByPk(strategyId);
        if (!strategy) return;

        const performance = strategy.performance;
        performance.trades.push(tradeResult);
        
        const winningTrades = performance.trades.filter(t => t.profit > 0).length;
        performance.winRate = (winningTrades / performance.trades.length) * 100;
        performance.profitLoss += tradeResult.profit;
        performance.lastUpdated = new Date();

        await strategy.update({ performance });
    };

    const createStrategyInstance = async (config) => {
        try {
            const { type, symbol, params } = config;
            validateStrategyConfig(config);

            switch (type.toLowerCase()) {
                case 'rsi':
                    return new RSIStrategy({ ...params, symbol });
                case 'bollinger':
                    return startBollingerBands(
                        'backtest',
                        config.interval || '1h',
                        symbol,
                        params.period,
                        params.standardDev,
                        null, // No API keys needed for backtest
                        null,
                        params.amount
                    );
                default:
                    throw new Error(`Unknown strategy type: ${type}`);
            }
        } catch (error) {
            logger.logError(error, { context: 'createStrategyInstance' });
            throw error;
        }
    };

    return {
        registerStrategy,
        startStrategy,
        stopStrategy,
        updateStrategy,
        getStrategyPerformance,
        updateStrategyPerformance,
        getActiveStrategies: () => new Map(activeStrategies),
        getStrategyConfigs: async () => {
            const strategies = await Strategy.findAll();
            return new Map(strategies.map(s => [s.id, s]));
        },
        createStrategyInstance
    };
};

export { createStrategyManager };