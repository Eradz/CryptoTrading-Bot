import AsyncHandler from "express-async-handler";
import { AppResponse } from "../../utils/index.js";
import { AuthenticateExchange } from "../../utils/AuthenticateExchange.js";
import { createStrategyManager } from "../../utils/strategies/strategy-manager.js";
import { executeTradeWithRisk } from "../../utils/trade/trade-manager.js";

const strategyManager = createStrategyManager({});

export const createTradeOrder = AsyncHandler(async (req, res) => {

    // Get Bot configurations
    const { symbol, side, type, amount, price, strategyId } = req.body;
    const userId = req.params.id
    const exchangeId = req.params.exchangeId
    // Check if there's user id and exchange details
    if(!userId || !exchangeId) {
        return AppResponse.error(res, "User ID and Exchange ID are required");
    }
    // Get authenticated Exchange instance
    const authenticatedExchange = await AuthenticateExchange({ userId, exchangeId });
    
    try {
        // If strategyId provided, use it; otherwise use provided side
        let orderSide = side;
        let strategySignal = null;

        if (strategyId) {
            // Get strategy from database
            const strategy = await strategyManager.getStrategyConfigs().then(configs => configs.get(strategyId));
            
            if (!strategy) {
                return AppResponse.error(res, `Strategy ${strategyId} not found`, 404);
            }

            // Create strategy instance
            const strategyInstance = await strategyManager.createStrategyInstance({
                type: strategy.type,
                symbol: symbol || strategy.symbol,
                params: strategy.params,
                interval: strategy.interval
            });

            // Get latest candles
            const ohlcv = await authenticatedExchange.fetchOHLCV(symbol || strategy.symbol, '1h', undefined, 200);
            
            // Create candle object from latest bar
            const latestOHLCV = ohlcv[ohlcv.length - 1];
            const candle = {
                timestamp: latestOHLCV[0],
                open: latestOHLCV[1],
                high: latestOHLCV[2],
                low: latestOHLCV[3],
                close: latestOHLCV[4],
                volume: latestOHLCV[5]
            };

            // Convert history to proper format
            const history = ohlcv.map(arr => ({
                close: arr[4],
                timestamp: arr[0],
                open: arr[1],
                high: arr[2],
                low: arr[3],
                volume: arr[5]
            }));

            // Get strategy signal
            strategySignal = await strategyInstance.analyze(candle, history);

            console.log("Strategy Signal:", strategySignal);
            if (!strategySignal || !strategySignal.action) {
                return AppResponse.success(res, "No trading signals from strategy", { signal: null });
            }

            orderSide = strategySignal.action;
        }

        // Fetch balance to determine account size
        const balances = await authenticatedExchange.fetchBalance();
        const accountBalance = (balances.total && balances.total.USDT) ? balances.total.USDT : 0;

        // Risk params (can be provided in request body)
        const riskParams = {
            accountBalance: accountBalance || 0,
            riskPercentage:  1, // percent
            riskRewardRatio: 2,
            maxPositionSize: Number.POSITIVE_INFINITY,
            maxRiskPerTrade: 2 // percent of account
        };
        console.log("Account Balance:", accountBalance);
        // Execute trade with risk management
        const tradeResult = await executeTradeWithRisk(
            authenticatedExchange,
            {
                symbol: symbol || (strategySignal?.symbol),
                side: orderSide,
                type: type || 'market',
                price: price || (strategySignal?.price)
            },
            riskParams,
            {
                userId,
                strategyId
            }
        );

        return AppResponse.success(res, 'Order executed successfully', { 
            trade: tradeResult,
            signal: strategySignal 
        });
    } catch (e) {
        console.error('Trade execution error:', e);
        return AppResponse.error(res, e.message || 'Trade execution failed');
    }
});