import { Router } from 'express';
import AsyncHandler from 'express-async-handler';
import { AppResponse } from '../../utils/AppResponse.js';
import { BacktestEngine } from '../../utils/backtesting/backtest-engine.js';
import { createStrategyManager } from '../../utils/strategies/strategy-manager.js';
import Strategy from '../../models/strategy.js';
import BacktestResult from '../../models/backtestResult.js';

const router = Router();
const backtestEngine = new BacktestEngine();
const strategyManager = createStrategyManager({});

const validateBacktestParams = (startTime, endTime, symbol, interval) => {
    if (!startTime || !endTime || !symbol) {
        throw new Error('startTime, endTime, and symbol are required');
    }
    
    const validIntervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
    if (interval && !validIntervals.includes(interval)) {
        throw new Error(`Invalid interval. Must be one of: ${validIntervals.join(', ')}`);
    }
    
    if (new Date(startTime) >= new Date(endTime)) {
        throw new Error('startTime must be before endTime');
    }
};

router.post('/run', AsyncHandler(async (req, res) => {
    const {
        strategyId,
        symbol,
        startTime,
        endTime,
        interval = '1h',
        config = {}
    } = req.body;

    try {
        validateBacktestParams(startTime, endTime, symbol, interval);

        // Get strategy from database
        const strategy = await Strategy.findByPk(strategyId);
        if (!strategy) {
            return AppResponse.error(res, `Strategy ${strategyId} not found`, 404);
        }

        // Create backtest engine with custom config
        const engine = new BacktestEngine({
            initialBalance: config.initialBalance || 10000, // Default initial balance
            fees: config.fees || 0.001, // Default 0.1% fee
            slippage: config.slippage || 0.001 // Default 0.1% slippage
        });

        // Create strategy instance for backtesting
        const strategyInstance = await strategyManager.createStrategyInstance({
            type: strategy.type,
            symbol: symbol || strategy.symbol,
            params: strategy.params,
            interval
        });

        // Run backtest
        const results = await engine.runBacktest(
            strategyInstance,
            symbol || strategy.symbol,
            new Date(startTime).getTime(),
            new Date(endTime).getTime(),
            interval
        );
        console.log(results);

        // Save backtest results to database
        await BacktestResult.create({
            strategyId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            symbol: symbol || strategy.symbol,
            interval,
            config: {
                initialBalance: engine.initialBalance,
                fees: engine.fees,
                slippage: engine.slippage
            },
            metrics: results.metrics && Object.keys(results.metrics).length > 0 ? results.metrics : {
                totalReturn: 0,
                sharpeRatio: 0,
                maxDrawdown: 0,
                winRate: 0,
                totalTrades: 0,
                finalBalance: engine.initialBalance,
                finalEquity: engine.initialBalance
            },
            trades: results.trades || [],
            equity: results.equity || []
        });

        return AppResponse.success(res, 'Backtest completed', results);
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
}));

router.get('/results/:strategyId', AsyncHandler(async (req, res) => {
    const { strategyId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    try {
        // Check if strategy exists
        const strategy = await Strategy.findByPk(strategyId);
        if (!strategy) {
            return AppResponse.error(res, `Strategy ${strategyId} not found`, 404);
        }

        // Fetch backtest results from database with pagination
        const results = await BacktestResult.findAndCountAll({
            where: { strategyId },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        return AppResponse.success(res, 'Backtest results retrieved', {
            results: results.rows,
            total: results.count,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
}));

router.get('/results/:strategyId/:backtestId', AsyncHandler(async (req, res) => {
    const { strategyId, backtestId } = req.params;

    try {
        const result = await BacktestResult.findOne({
            where: { 
                id: backtestId,
                strategyId 
            }
        });

        if (!result) {
            return AppResponse.error(res, 'Backtest result not found', 404);
        }

        return AppResponse.success(res, 'Backtest result retrieved', result);
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
}));

export default router;