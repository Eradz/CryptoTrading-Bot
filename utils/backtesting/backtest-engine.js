import { createPublicExchange } from '../portfolio/portfolio-analytics.js';

class BacktestEngine {
    constructor(config = {}) {
        this.initialBalance = config.initialBalance || 10000; // Default 10k USDT
        this.fees = config.fees || 0.001; // Default 0.1% trading fee
        this.slippage = config.slippage || 0.001; // Default 0.1% slippage
        
        this.balance = this.initialBalance;
        this.positions = new Map();
        this.trades = [];
        this.equity = [];
    }

    async runBacktest(strategy, symbol, startTime, endTime, interval = '1h') {
        try {
            console.log('Starting backtest:', { symbol, startTime, endTime, interval });
            
            // Initialize exchange and fetch historical data
            const exchange = createPublicExchange('binance');
            const ohlcv = await exchange.fetchOHLCV(symbol, interval, startTime, endTime);
            
            console.log('Fetched candles:', ohlcv.length);

            // Reset backtest state
            this.balance = this.initialBalance;
            this.positions.clear();
            this.trades = [];
            this.equity = [];

            // Run strategy on each candle
            for (let i = 0; i < ohlcv.length; i++) {
                const candle = {
                    timestamp: ohlcv[i][0],
                    open: ohlcv[i][1],
                    high: ohlcv[i][2],
                    low: ohlcv[i][3],
                    close: ohlcv[i][4],
                    volume: ohlcv[i][5]
                };

                    // Convert ohlcv slice to array of objects with close property
                    const history = ohlcv.slice(0, i + 1).map(arr => ({
                        close: arr[4],
                        timestamp: arr[0],
                        open: arr[1],
                        high: arr[2],
                        low: arr[3],
                        volume: arr[5]
                    }));

                    // Get strategy signal
                    const signal = await strategy.analyze(candle, history);
                    if (signal) {
                        console.log('Strategy signal:', { 
                            time: new Date(candle.timestamp).toISOString(),
                            ...signal 
                        });
                        if (signal.action) {
                            this.executeSignal(signal, candle);
                        }
                    }

                // Record equity point
                this.recordEquity(candle.timestamp, candle.close);
            }

            return this.generateReport();
        } catch (error) {
            console.error('Backtest error:', error);
            throw error;
        }
    }

    executeSignal(signal, candle) {
        const { action, symbol, amount = 1, price = candle.close } = signal;
        const executionPrice = this.adjustPriceForSlippage(price, action);
        const cost = amount * executionPrice;
        const fee = cost * this.fees;
        
        console.log('Executing signal:', {
            action,
            symbol,
            amount,
            price: executionPrice,
            cost,
            fee,
            balance: this.balance
        });

        if (action === 'buy') {
            if (this.balance >= cost + fee) {
                this.balance -= (cost + fee);
                const position = this.positions.get(symbol) || 0;
                this.positions.set(symbol, position + amount);
                this.recordTrade('buy', symbol, amount, executionPrice, fee);
            }
        } else if (action === 'sell') {
            const position = this.positions.get(symbol) || 0;
            if (position >= amount) {
                this.balance += (cost - fee);
                this.positions.set(symbol, position - amount);
                this.recordTrade('sell', symbol, amount, executionPrice, fee);
            }
        }
    }

    adjustPriceForSlippage(price, action) {
        const slippageMultiplier = action === 'buy' ? 1 + this.slippage : 1 - this.slippage;
        return price * slippageMultiplier;
    }

    recordTrade(action, symbol, amount, price, fee) {
        this.trades.push({
            timestamp: Date.now(),
            action,
            symbol,
            amount,
            price,
            fee,
            value: amount * price,
            balance: this.balance
        });
    }

    recordEquity(timestamp, lastPrice) {
        let totalEquity = this.balance;
        for (const [symbol, amount] of this.positions.entries()) {
            totalEquity += amount * lastPrice;
        }
        this.equity.push({
            timestamp,
            equity: totalEquity
        });
    }

    calculateMetrics() {
        if (this.equity.length < 2) return {};

        const returns = [];
        for (let i = 1; i < this.equity.length; i++) {
            const return_i = (this.equity[i].equity - this.equity[i-1].equity) / this.equity[i-1].equity;
            returns.push(return_i);
        }

        const initialEquity = this.equity[0].equity;
        const finalEquity = this.equity[this.equity.length - 1].equity;
        const totalReturn = (finalEquity - initialEquity) / initialEquity;
        
        // Calculate Sharpe Ratio (assuming risk-free rate of 0 for simplicity)
        const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const stdReturn = Math.sqrt(
            returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length
        );
        const sharpeRatio = meanReturn / stdReturn * Math.sqrt(252); // Annualized

        // Maximum Drawdown
        let maxDrawdown = 0;
        let peak = -Infinity;
        for (const point of this.equity) {
            if (point.equity > peak) peak = point.equity;
            const drawdown = (peak - point.equity) / peak;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        // Win rate
        const winningTrades = this.trades.filter(t => {
            if (t.action === 'buy') return false;
            const entryTrade = this.trades.find(et => 
                et.action === 'buy' && 
                et.symbol === t.symbol && 
                et.timestamp < t.timestamp
            );
            return entryTrade && (t.price - entryTrade.price) > 0;
        }).length;
        const totalTrades = this.trades.filter(t => t.action === 'sell').length;
        const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;

        return {
            totalReturn: totalReturn * 100,
            sharpeRatio,
            maxDrawdown: maxDrawdown * 100,
            winRate: winRate * 100,
            totalTrades,
            finalBalance: this.balance,
            finalEquity: finalEquity
        };
    }

    generateReport() {
        const metrics = this.calculateMetrics();
        return {
            metrics,
            trades: this.trades,
            equity: this.equity,
            config: {
                initialBalance: this.initialBalance,
                fees: this.fees,
                slippage: this.slippage
            }
        };
    }
}

export { BacktestEngine };