import { RSI, SMA, MACD, BollingerBands } from "technicalindicators";
import { logger, alerts } from "../monitoring/monitoring.js";
import { 
    calculatePositionSize, 
    calculateStopLoss, 
    calculateTakeProfit 
} from "../risk-management/position-manager.js";

class TradingEngine {
    constructor(exchange, bot, config = {}) {
        this.exchange = exchange;
        this.bot = bot;
        this.config = {
            minConfidence: 0.7, // Minimum signal confidence
            cooldownPeriod: 300000, // 5 minutes between trades
            maxRetries: 3,
            ...config
        };
        this.lastTradeTime = 0;
        this.intervalId = null;
        this.isRunning = false;
    }

    /**
     * Start the trading bot
     */
    async start() {
        if (this.isRunning) {
            throw new Error("Bot is already running");
        }

        try {
            this.isRunning = true;
            logger.logTrade({
                type: 'BOT_STARTED',
                botId: this.bot.id,
                strategy: this.bot.strategy,
                symbol: this.bot.symbol
            });

            await this.executeTradingCycle();
            
            // Set up recurring execution
            const intervalMs = this.getIntervalMs(this.bot.interval);
            this.intervalId = setInterval(() => {
                this.executeTradingCycle().catch(err => {
                    logger.logError(err, { 
                        context: 'TradingEngine.executeTradingCycle',
                        botId: this.bot.id 
                    });
                });
            }, intervalMs);

            return { success: true, message: "Bot started successfully" };
        } catch (error) {
            this.isRunning = false;
            logger.logError(error, { context: 'TradingEngine.start', botId: this.bot.id });
            throw error;
        }
    }

    /**
     * Stop the trading bot
     */
    async stop() {
        if (!this.isRunning) {
            return { success: true, message: "Bot is not running" };
        }

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.isRunning = false;
        
        logger.logTrade({
            type: 'BOT_STOPPED',
            botId: this.bot.id
        });

        return { success: true, message: "Bot stopped successfully" };
    }

    /**
     * Execute one trading cycle
     */
    async executeTradingCycle() {
        try {
            // Check cooldown
            const now = Date.now();
            if (now - this.lastTradeTime < this.config.cooldownPeriod) {
                return { skipped: true, reason: 'cooldown' };
            }

            // Fetch market data
            const ohlcv = await this.exchange.fetchOHLCV(
                this.bot.symbol, 
                this.bot.interval, 
                undefined, 
                200
            );

            if (!ohlcv || ohlcv.length < 50) {
                throw new Error("Insufficient market data");
            }

            // Analyze market
            const signal = await this.analyzeMarket(ohlcv);
            console.log(signal)
            // Execute trade if signal is strong
            if (signal.action !== 'hold' && signal.confidence >= this.config.minConfidence) {
                await this.executeTrade(signal);
                this.lastTradeTime = now;
            }

            return signal;
        } catch (error) {
            logger.logError(error, { 
                context: 'TradingEngine.executeTradingCycle',
                botId: this.bot.id 
            });
            throw error;
        }
    }

    /**
     * Analyze market and generate trading signal
     */
    async analyzeMarket(ohlcv) {
        const closes = ohlcv.map(candle => candle[4]);
        const highs = ohlcv.map(candle => candle[2]);
        const lows = ohlcv.map(candle => candle[3]);
        
        const params = this.bot.parameters;
        let signal = { action: 'hold', confidence: 0, indicators: {} };

        switch (this.bot.strategy) {
            case 'RSI_SMA_MACD':
                signal = this.analyzeRSI_SMA_MACD(closes, params);
                break;
            case 'BOLLINGER_BANDS':
                signal = this.analyzeBollingerBands(closes, params);
                break;
            case 'HYBRID':
                signal = this.analyzeHybrid(closes, highs, lows, params);
                break;
            default:
                throw new Error(`Unknown strategy: ${this.bot.strategy}`);
        }

        logger.logTrade({
            type: 'SIGNAL_GENERATED',
            botId: this.bot.id,
            signal
        });

        return signal;
    }

    /**
     * RSI + SMA + MACD Strategy Analysis
     */
    analyzeRSI_SMA_MACD(closes, params) {
        const rsi = RSI.calculate({ 
            period: params.rsi.period, 
            values: closes 
        });
        
        const smaShort = SMA.calculate({ 
            period: params.sma.shortPeriod, 
            values: closes 
        });
        
        const smaLong = SMA.calculate({ 
            period: params.sma.longPeriod, 
            values: closes 
        });
        
        const macd = MACD.calculate({
            fastPeriod: params.macd.fastPeriod,
            slowPeriod: params.macd.slowPeriod,
            signalPeriod: params.macd.signalPeriod,
            SimpleMAOscillator: true,
            SimpleMASignal: true,
            values: closes
        });

        // Get latest values
        const currentRSI = rsi[rsi.length - 1];
        const currentPrice = closes[closes.length - 1];
        const currentSMAShort = smaShort[smaShort.length - 1];
        const currentSMALong = smaLong[smaLong.length - 1];
        const currentMACD = macd[macd.length - 1];
        const prevMACD = macd[macd.length - 2];

        // Calculate signals
        const signals = {
            rsi: this.getRSISignal(currentRSI, params.rsi),
            trend: currentPrice > currentSMALong ? 1 : -1,
            goldenCross: currentSMAShort > currentSMALong ? 1 : -1,
            macd: this.getMACDSignal(currentMACD, prevMACD)
        };

        // Calculate confidence based on signal confluence
        let bullishCount = 0;
        let bearishCount = 0;
        
        Object.values(signals).forEach(sig => {
            if (sig > 0) bullishCount++;
            if (sig < 0) bearishCount++;
        });

        const totalSignals = Object.keys(signals).length;
        let action = 'hold';
        let confidence = 0;

        if (bullishCount >= 3) {
            action = 'buy';
            confidence = bullishCount / totalSignals;
        } else if (bearishCount >= 3) {
            action = 'sell';
            confidence = bearishCount / totalSignals;
        }

        return {
            action,
            confidence,
            indicators: {
                rsi: currentRSI,
                smaShort: currentSMAShort,
                smaLong: currentSMALong,
                macd: currentMACD,
                price: currentPrice
            },
            signals
        };
    }

    /**
     * Bollinger Bands Strategy Analysis
     */
    analyzeBollingerBands(closes, params) {
        const bb = BollingerBands.calculate({
            period: params.bollinger.period,
            stdDev: params.bollinger.standardDev,
            values: closes
        });

        const current = bb[bb.length - 1];
        const currentPrice = closes[closes.length - 1];

        // Calculate %B (position within bands)
        const percentB = (currentPrice - current.lower) / (current.upper - current.lower);

        let action = 'hold';
        let confidence = 0;

        if (percentB < 0.2) {
            // Price near lower band - potential buy
            action = 'buy';
            confidence = 1 - percentB;
        } else if (percentB > 0.8) {
            // Price near upper band - potential sell
            action = 'sell';
            confidence = percentB;
        }

        return {
            action,
            confidence,
            indicators: {
                upper: current.upper,
                middle: current.middle,
                lower: current.lower,
                percentB,
                price: currentPrice
            }
        };
    }

    /**
     * Hybrid Strategy (combines multiple strategies)
     */
    analyzeHybrid(closes, highs, lows, params) {
        const rsiMacdSignal = this.analyzeRSI_SMA_MACD(closes, params);
        const bbSignal = this.analyzeBollingerBands(closes, params);

        // Weight the signals
        const rsiWeight = 0.6;
        const bbWeight = 0.4;

        let combinedScore = 0;
        
        if (rsiMacdSignal.action === 'buy') {
            combinedScore += rsiMacdSignal.confidence * rsiWeight;
        } else if (rsiMacdSignal.action === 'sell') {
            combinedScore -= rsiMacdSignal.confidence * rsiWeight;
        }

        if (bbSignal.action === 'buy') {
            combinedScore += bbSignal.confidence * bbWeight;
        } else if (bbSignal.action === 'sell') {
            combinedScore -= bbSignal.confidence * bbWeight;
        }

        let action = 'hold';
        let confidence = Math.abs(combinedScore);

        if (combinedScore > 0.5) {
            action = 'buy';
        } else if (combinedScore < -0.5) {
            action = 'sell';
        }

        return {
            action,
            confidence,
            indicators: {
                ...rsiMacdSignal.indicators,
                ...bbSignal.indicators
            },
            subSignals: {
                rsiMacd: rsiMacdSignal,
                bollinger: bbSignal
            }
        };
    }

    /**
     * Execute trade with risk management
     */
    async executeTrade(signal) {
        try {
            const balance = await this.exchange.fetchBalance();
            const accountBalance = balance.total.USDT || 0;

            if (accountBalance < 10) {
                throw new Error("Insufficient balance for trading");
            }

            const currentPrice = signal.indicators.price;
            const risk = this.bot.riskManagement;

            // Calculate position parameters
            const stopLoss = calculateStopLoss(
                signal.action,
                currentPrice,
                risk.stopLossPercentage
            );

            const positionSize = calculatePositionSize(
                accountBalance,
                risk.riskPercentage,
                currentPrice,
                stopLoss
            );

            const takeProfit = calculateTakeProfit(
                signal.action,
                currentPrice,
                stopLoss,
                risk.riskRewardRatio
            );

            // Execute main order
            const order = await this.exchange.createOrder(
                this.bot.symbol,
                'market',
                signal.action,
                positionSize
            );

            logger.logTrade({
                type: 'TRADE_EXECUTED',
                botId: this.bot.id,
                order,
                signal,
                stopLoss,
                takeProfit,
                positionSize
            });

            alerts.tradeAlert({
                botId: this.bot.id,
                symbol: this.bot.symbol,
                side: signal.action,
                size: positionSize,
                price: currentPrice
            });

            return {
                success: true,
                order,
                stopLoss,
                takeProfit
            };
        } catch (error) {
            logger.logError(error, { 
                context: 'TradingEngine.executeTrade',
                botId: this.bot.id 
            });
            throw error;
        }
    }

    // Helper methods
    getRSISignal(rsi, params) {
        if (rsi < params.oversold) return 1; // Buy signal
        if (rsi > params.overbought) return -1; // Sell signal
        return 0;
    }

    getMACDSignal(current, previous) {
        if (!previous) return 0;
        
        const bullishCross = previous.MACD <= previous.signal && current.MACD > current.signal;
        const bearishCross = previous.MACD >= previous.signal && current.MACD < current.signal;
        
        if (bullishCross) return 1;
        if (bearishCross) return -1;
        return current.MACD > current.signal ? 0.5 : -0.5;
    }

    getIntervalMs(interval) {
        const intervals = {
            '1m': 60000,
            '5m': 300000,
            '15m': 900000,
            '30m': 1800000,
            '1h': 3600000,
            '4h': 14400000,
            '1d': 86400000
        };
        return intervals[interval] || 3600000;
    }
}

export { TradingEngine };