import { RSI, SMA, MACD } from "technicalindicators";

export class RSIStrategy {
    constructor(params = {}) {
        this.rsiPeriod = params.rsiPeriod || 14;
        this.smaShortPeriod = params.smaShortPeriod || 20;
        this.smaLongPeriod = params.smaLongPeriod || 200;
        this.macdInput = params.macdInput || {
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: true,
            SimpleMASignal: true
        };
        this.symbol = params.symbol || 'BTC/USDT';
        this.riskPercentage = params.riskPercentage || 0.01; // 1% risk per trade
        this.riskRewardRatio = params.riskRewardRatio || 2; // 1:2 risk:reward
    }

    analyze(candle, history) {
        // Convert OHLCV data to closes
        const closes = history.map(c => typeof c[4] === 'number' ? c[4] : c.close);
        
        // Check if we have enough data
        if (closes.length < Math.max(this.rsiPeriod, this.smaLongPeriod)) {
            console.log('Not enough data:', { 
                dataPoints: closes.length, 
                requiredPoints: Math.max(this.rsiPeriod, this.smaLongPeriod)
            });
            return null;
        }
        
        // console.log('Calculating indicators with data points:', closes.length);
        
        // === CALCULATE INDICATORS ===
        const rsi = RSI.calculate({ period: this.rsiPeriod, values: closes });
        const sma50 = SMA.calculate({ period: this.smaShortPeriod, values: closes });
        const sma200 = SMA.calculate({ period: this.smaLongPeriod, values: closes });
        const macd = MACD.calculate({ ...this.macdInput, values: closes });

        // Get current values
        const price = candle.close;
        const currentRSI = rsi[rsi.length - 1];
        const currentSMA50 = sma50[sma50.length - 1];
        const currentSMA200 = sma200[sma200.length - 1];
        const currentMACD = macd[macd.length - 1];
        const prevMACD = macd[macd.length - 2];

        if (!currentRSI || !currentSMA50 || !currentSMA200 || !currentMACD || !prevMACD) {
            return null;
        }

        // === CONDITIONS ===
        const aboveSMA200 = price > currentSMA200;
        const goldenCross = currentSMA50 > currentSMA200;
        const rsiOversold = currentRSI < 30;
        const rsiOverbought = currentRSI > 70;
        const macdCrossoverUp = prevMACD.MACD <= prevMACD.signal && currentMACD.MACD > currentMACD.signal;
        const macdCrossoverDown = prevMACD.MACD >= prevMACD.signal && currentMACD.MACD < currentMACD.signal;
        
        // console.log('Conditions:', {
        //     price,
        //     currentRSI,
        //     currentSMA50,
        //     currentSMA200,
        //     aboveSMA200,
        //     goldenCross,
        //     rsiOversold,
        //     rsiOverbought,
        //     macdCrossoverUp,
        //     macdCrossoverDown
        // });

        // === SIGNALS ===
        if (aboveSMA200 && goldenCross && rsiOversold && macdCrossoverUp) {
            return {
                action: 'buy',
                symbol: this.symbol,
                price,
                timestamp: candle.timestamp,
                tradeParams: {
                    symbol: this.symbol,
                    side: 'buy',
                    type: 'limit',
                    price: price
                },
                riskParams: {
                    riskPercentage: this.riskPercentage,
                    riskRewardRatio: this.riskRewardRatio,
                    stopLoss: price * 0.98, // 2% below entry
                    takeProfit: price * 1.04 // 4% above entry
                }
            };
        } else if (!aboveSMA200 && !goldenCross && rsiOverbought && macdCrossoverDown) {
            return {
                action: 'sell',
                symbol: this.symbol,
                price,
                timestamp: candle.timestamp,
                tradeParams: {
                    symbol: this.symbol,
                    side: 'sell',
                    type: 'limit',
                    price: price
                },
                riskParams: {
                    riskPercentage: this.riskPercentage,
                    riskRewardRatio: this.riskRewardRatio,
                    stopLoss: price * 1.02, // 2% above entry for shorts
                    takeProfit: price * 0.96 // 4% below entry for shorts
                }
            };
        }
        return null;
    }

    // For live trading, this method will be called periodically
    async poll() {
        // In live trading, fetch latest candles here
        // For now, return null as this is handled by the backtest engine
        return null;
    }
}