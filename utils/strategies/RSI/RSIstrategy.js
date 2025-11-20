import { RSI, SMA, MACD } from "technicalindicators";

/**
 * RSI + SMA + MACD Collaboration Strategy
 * @param {Array<number>} closes - Array of closing prices
 * @param {Object} options - Strategy options
 * @returns {Object} Strategy signals and analysis
 */
export const RSI_SMA_MACD_COLLABStrategies = (closes, options = {}) => {
    // === INPUTS ===
    const rsiPeriod = options.rsiPeriod || 14;
    const smaShortPeriod = options.smaShortPeriod || 20;
    const smaLongPeriod = options.smaLongPeriod || 200;
    const macdInput = {
        fastPeriod: options.fastPeriod || 12,
        slowPeriod: options.slowPeriod || 26,
        signalPeriod: options.signalPeriod || 9,
        SimpleMAOscillator: true,
        SimpleMASignal: true
    };

    // Validate input
    if (!closes || closes.length < smaLongPeriod) {
        throw new Error(`Insufficient data. Need at least ${smaLongPeriod} candles`);
    }

    // === CALCULATE INDICATORS ===
    const rsi = RSI.calculate({ period: rsiPeriod, values: closes });
    const smaShort = SMA.calculate({ period: smaShortPeriod, values: closes });
    const smaLong = SMA.calculate({ period: smaLongPeriod, values: closes });
    const macd = MACD.calculate({ ...macdInput, values: closes });

    // === ALIGN ARRAYS ===
    const startIndex = Math.max(
        rsiPeriod,
        smaShortPeriod,
        smaLongPeriod,
        macdInput.slowPeriod + macdInput.signalPeriod
    ) - 1;

    // === TRADING LOGIC ===
    const signals = [];
    let currentSignal = null;

    for (let i = startIndex; i < closes.length; i++) {
        const price = closes[i];
        const currentRSI = rsi[i - rsiPeriod + 1];
        const currentSMAShort = smaShort[i - smaShortPeriod + 1];
        const currentSMALong = smaLong[i - smaLongPeriod + 1];
        const currentMACD = macd[i - (macdInput.slowPeriod + macdInput.signalPeriod - 1)];

        // Skip if any value missing
        if (!currentRSI || !currentSMAShort || !currentSMALong || !currentMACD) continue;

        const prevMACD = macd[i - (macdInput.slowPeriod + macdInput.signalPeriod - 1) - 1];

        // === CONDITIONS ===
        const aboveSMALong = price > currentSMALong;
        const goldenCross = currentSMAShort > currentSMALong;
        const rsiOversold = currentRSI < 30;
        const rsiOverbought = currentRSI > 70;
        const macdBullish = currentMACD.MACD > currentMACD.signal;
        const macdCrossoverUp = prevMACD && 
            prevMACD.MACD <= prevMACD.signal && 
            currentMACD.MACD > currentMACD.signal;
        const macdCrossoverDown = prevMACD && 
            prevMACD.MACD >= prevMACD.signal && 
            currentMACD.MACD < currentMACD.signal;

        let signal = null;
        let strength = 0;

        // === BUY SIGNALS ===
        if (aboveSMALong && goldenCross && rsiOversold && macdCrossoverUp) {
            signal = "STRONG_BUY";
            strength = 4;
        } else if (goldenCross && macdBullish && currentRSI > 50 && currentRSI < 70) {
            signal = "BUY";
            strength = 3;
        } else if (macdCrossoverUp && currentRSI < 50) {
            signal = "WEAK_BUY";
            strength = 2;
        }

        // === SELL SIGNALS ===
        if (!aboveSMALong && !goldenCross && rsiOverbought && macdCrossoverDown) {
            signal = "STRONG_SELL";
            strength = -4;
        } else if (!goldenCross && !macdBullish && currentRSI < 50 && currentRSI > 30) {
            signal = "SELL";
            strength = -3;
        } else if (macdCrossoverDown && currentRSI > 50) {
            signal = "WEAK_SELL";
            strength = -2;
        }

        if (signal) {
            const signalData = {
                index: i,
                price: price,
                signal: signal,
                strength: strength,
                indicators: {
                    rsi: currentRSI.toFixed(2),
                    smaShort: currentSMAShort.toFixed(2),
                    smaLong: currentSMALong.toFixed(2),
                    macd: currentMACD.MACD.toFixed(3),
                    macdSignal: currentMACD.signal.toFixed(3),
                    macdHistogram: currentMACD.histogram?.toFixed(3)
                },
                conditions: {
                    aboveSMALong,
                    goldenCross,
                    rsiOversold,
                    rsiOverbought,
                    macdBullish,
                    macdCrossoverUp,
                    macdCrossoverDown
                }
            };

            signals.push(signalData);
            currentSignal = signalData;
        }
    }

    // Return the latest signal and all historical signals
    return {
        currentSignal: currentSignal,
        allSignals: signals,
        latestIndicators: currentSignal ? currentSignal.indicators : null,
        summary: {
            totalSignals: signals.length,
            buySignals: signals.filter(s => s.strength > 0).length,
            sellSignals: signals.filter(s => s.strength < 0).length,
            strongSignals: signals.filter(s => Math.abs(s.strength) >= 3).length
        }
    };
};

/**
 * Get recommendation based on current market conditions
 * @param {Object} strategyResult - Result from RSI_SMA_MACD_COLLABStrategies
 * @returns {Object} Trading recommendation
 */
export const getTradeRecommendation = (strategyResult) => {
    if (!strategyResult.currentSignal) {
        return {
            action: "HOLD",
            confidence: 0,
            reason: "No clear signal detected"
        };
    }

    const { signal, strength, price, indicators } = strategyResult.currentSignal;

    let action = "HOLD";
    let confidence = 0;

    if (signal.includes("BUY")) {
        action = "BUY";
        confidence = Math.abs(strength) * 25; // 25%, 50%, 75%, 100%
    } else if (signal.includes("SELL")) {
        action = "SELL";
        confidence = Math.abs(strength) * 25;
    }

    return {
        action,
        confidence,
        signal,
        entryPrice: price,
        indicators,
        reason: generateReason(strategyResult.currentSignal)
    };
};

/**
 * Generate human-readable reason for the signal
 */
const generateReason = (signalData) => {
    const { signal, conditions, indicators } = signalData;
    const reasons = [];

    if (signal.includes("BUY")) {
        if (conditions.rsiOversold) reasons.push("RSI is oversold");
        if (conditions.macdCrossoverUp) reasons.push("MACD bullish crossover");
        if (conditions.goldenCross) reasons.push("Golden cross detected");
        if (conditions.aboveSMALong) reasons.push("Price above long-term SMA");
    } else if (signal.includes("SELL")) {
        if (conditions.rsiOverbought) reasons.push("RSI is overbought");
        if (conditions.macdCrossoverDown) reasons.push("MACD bearish crossover");
        if (!conditions.goldenCross) reasons.push("Death cross or bearish trend");
        if (!conditions.aboveSMALong) reasons.push("Price below long-term SMA");
    }

    return reasons.join(", ");
};