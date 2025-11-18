import { createStrategyManager } from "./strategy-manager.js";
import { executeTradeWithRisk } from "../trade/trade-manager.js";
import { logger } from "../monitoring/monitoring.js";

// In production, use BullMQ, Agenda, or node-cron for distributed scheduling. For demo, use setInterval.
const strategyManager = createStrategyManager({});

// Polling interval in ms (e.g., every minute)
const POLL_INTERVAL = 60 * 1000;

const startStrategyPollingWorker = () => {
    setInterval(async () => {
        try {
            const activeStrategies = strategyManager.getActiveStrategies();
            for (const [strategyId, strategyInstance] of activeStrategies.entries()) {
                // Each strategyInstance should expose a poll() or run() method
                if (typeof strategyInstance.poll === "function") {
                    const signal = await strategyInstance.poll();
                    if (signal && signal.action) {
                        // Place order via tradeManager
                        await executeTradeWithRisk(signal);
                        logger.logTrade({ type: "STRATEGY_SIGNAL", strategyId, signal });
                    }
                }
            }
        } catch (err) {
            logger.logError(err, { context: "strategyPollingWorker" });
        }
    }, POLL_INTERVAL);
};

export { startStrategyPollingWorker };
