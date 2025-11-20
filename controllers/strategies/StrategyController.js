import AsyncHandler from "express-async-handler";
import { AppResponse } from "../../utils/AppResponse.js";
import { createStrategyManager } from "../../utils/strategies/strategy-manager.js";
import { sequelize } from "../../db.js";
// import { scheduleStrategyPolling, strategyQueue } from "../../utils/strategies/strategy-queue.js";


export const getQueueStatusController = AsyncHandler(async (req, res) => {
    // const jobCounts = await strategyQueue.getJobCounts();
    // const waitingJobs = await strategyQueue.getWaiting();
    // const activeJobs = await strategyQueue.getActive();
    // return AppResponse.success(res, "Queue status", {
    //     counts: jobCounts,
    //     waiting: waitingJobs.length,
    //     active: activeJobs.length
    // });
    return AppResponse.success(res, "Queue status", null)
});

// For demo, use a singleton manager (in production, scope per user/session)
const strategyManager = createStrategyManager({});

export const registerStrategyController = AsyncHandler(async (req, res) => {
    const { strategyId, config } = req.body;
    if (!strategyId || !config) {
        return AppResponse.error(res, "strategyId and config required");
    }
    await strategyManager.registerStrategy(strategyId, config);
    return AppResponse.success(res, "Strategy registered", { strategyId });
});

export const startStrategyController = AsyncHandler(async (req, res) => {
    const { strategyId } = req.body;
    // if (!strategyId) {
    //     return AppResponse.error(res, "strategyId required");
    // }
    // await strategyManager.startStrategy(strategyId);
    // await scheduleStrategyPolling(strategyId);
    return AppResponse.success(res, "Strategy started", { strategyId });
});

export const stopStrategyController = AsyncHandler(async (req, res) => {
    // const { strategyId } = req.body;
    // if (!strategyId) {
    //     return AppResponse.error(res, "strategyId required");
    // }
    // await strategyManager.stopStrategy(strategyId);
    // // Remove all scheduled jobs for this strategy
    // const jobs = await strategyQueue.getJobs(['wait', 'active', 'delayed']);
    // for (const job of jobs) {
    //     if (job.data.strategyId === strategyId) {
    //         await job.remove();
    //     }
    // }
    return AppResponse.success(res, "Strategy stopped", null);
});

export const updateStrategyController = AsyncHandler(async (req, res) => {
    const { strategyId, config } = req.body;
    if (!strategyId || !config) {
        return AppResponse.error(res, "strategyId and config required");
    }
    await strategyManager.updateStrategy(strategyId, config);
    return AppResponse.success(res, "Strategy updated", { strategyId });
});

export const getStrategyPerformanceController = AsyncHandler(async (req, res) => {
    const { strategyId } = req.params;
    if (!strategyId) {
        return AppResponse.error(res, "strategyId required");
    }
    const perf = strategyManager.getStrategyPerformance(strategyId);
    return AppResponse.success(res, "Strategy performance", { strategyId, perf });
});
