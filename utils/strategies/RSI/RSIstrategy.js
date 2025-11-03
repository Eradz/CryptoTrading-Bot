import { RSI, SMA, MACD } from "technicalindicators";

export const RSI_SMA_MACD_COLLABStrategies = (closes) =>{
      
    // === INPUTS ===
    const rsiPeriod = 14;
    const smaShortPeriod = 20;
    const smaLongPeriod = 200;
    const macdInput = {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: true,
      SimpleMASignal: true
    };
    
    // === CALCULATE INDICATORS ===
    const rsi = RSI.calculate({ period: rsiPeriod, values: closes });
    const sma50 = SMA.calculate({ period: smaShortPeriod, values: closes });
    const sma200 = SMA.calculate({ period: smaLongPeriod, values: closes });
    const macd = MACD.calculate({ ...macdInput, values: closes });
    
    // === ALIGN ARRAYS (start from longest period) ===
    const startIndex = Math.max(rsiPeriod, smaShortPeriod, smaLongPeriod, macdInput.slowPeriod + macdInput.signalPeriod) - 1;
    
    // === TRADING LOGIC ===
    console.log("Date".padEnd(12), "Price", "RSI", "SMA50", "SMA200", "MACD", "Signal");
    console.log("-".repeat(80));
    
    const signals = [];
    
    for (let i = startIndex; i < closes.length; i++) {
      const price = closes[i];
      const currentRSI = rsi[i - rsiPeriod + 1];
      const currentSMA50 = sma50[i - smaShortPeriod + 1];
      const currentSMA200 = sma200[i - smaLongPeriod + 1];
      const currentMACD = macd[i - (macdInput.slowPeriod + macdInput.signalPeriod - 1)];
    
      // Skip if any value missing
      if (!currentRSI || !currentSMA50 || !currentSMA200 || !currentMACD) continue;
    
      const prevMACD = macd[i - (macdInput.slowPeriod + macdInput.signalPeriod - 1) - 1];
    
      // === CONDITIONS ===
      const aboveSMA200 = price > currentSMA200;
      const goldenCross = currentSMA50 > currentSMA200;
      const rsiOversold = currentRSI < 30;
      const rsiOverbought = currentRSI > 70;
      const macdBullish = currentMACD.MACD > currentMACD.signal;
      const macdCrossoverUp = prevMACD && prevMACD.MACD <= prevMACD.signal && currentMACD.MACD > currentMACD.signal;
      const macdCrossoverDown = prevMACD && prevMACD.MACD >= prevMACD.signal && currentMACD.MACD < currentMACD.signal;
    
      let signal = "";
    
      // === BUY SIGNAL: 4/4 Confluence ===
      if (aboveSMA200 && goldenCross && rsiOversold && macdCrossoverUp) {
        signal = "STRONG BUY";
      }
      // === SELL SIGNAL ===
      else if (!aboveSMA200 && !goldenCross && rsiOverbought && macdCrossoverDown) {
        signal = "STRONG SELL";
      }
      // === WEAK SIGNALS ===
      else if (goldenCross && macdBullish && currentRSI > 50) {
        signal = "BUY (Trend)";
      }
      else if (!goldenCross && !macdBullish && currentRSI < 50) {
        signal = "SELL (Trend)";
      }
    
      if (signal) {
        signals.push({ index: i, price, signal, rsi: currentRSI.toFixed(2) });
      }
      
      console.log(signals)
    //   // Print row
    //   console.log(
    //     `Bar ${String(i).padEnd(8)}`,
    //     String(price).padEnd(6),
    //     String(currentRSI.toFixed(1)).padEnd(5),
    //     String(currentSMA50.toFixed(2)).padEnd(7),
    //     String(currentSMA200.toFixed(2)).padEnd(8),
    //     `${currentMACD.MACD.toFixed(3)}/${currentMACD.signal.toFixed(3)}`.padEnd(12),
    //     signal
    //   );
    // }
    
    // // === SUMMARY ===
    // console.log("\n" + "=".repeat(50));
    // console.log("SIGNAL SUMMARY");
    // console.log("=".repeat(50));
    // signals.forEach(s => {
    //   console.log(`Bar ${s.index}: ${s.signal} @ $${s.price} (RSI: ${s.rsi})`);
    // });
    }
}
