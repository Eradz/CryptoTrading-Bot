// import { Queue, Worker } from 'bullmq';
// import { createStrategyManager } from "./strategy-manager.js";
// import { executeTradeWithRisk } from "../trade/trade-manager.js";
// import { createAuthenticatedExchange } from "../portfolio/portfolio-analytics.js";
// import { logger } from "../monitoring/monitoring.js";
// import IORedis from 'ioredis';
// // Redis connection (move to config in production)
// const connection = new IORedis('redis://127.0.0.1:6379', {
//     maxRetriesPerRequest: 3
// });

// connection.on('error', (err) => {
//     console.log(err, { context: "RedisConnection" });
// });
// connection.on('connect', () => {
//     console.log('Connected to Redis', { context: "RedisConnection" });
// });

// // Create queues
// const strategyQueue = new Queue('strategy-signals', { connection });
// const tradeQueue = new Queue('trade-execution', { connection });

// // Singleton instances (in production, scope per user/session)
// const strategyManager = createStrategyManager({});

// // Process strategy polling jobs
// const strategyWorker = new Worker('strategy-signals', async job => {
//     try {
//         const { strategyId } = job.data;
//         const strategy = strategyManager.getActiveStrategies().get(strategyId);
        
//         if (!strategy || typeof strategy.poll !== "function") {
//             throw new Error(`Invalid strategy ${strategyId}`);
//         }

//         const signal = await strategy.poll();
//         if (signal && signal.action) {
//             // Add trade execution job to separate queue
//             await tradeQueue.add('execute-trade', {
//                 strategyId,
//                 signal
//             }, {
//                 attempts: 3,
//                 backoff: {
//                     type: 'exponential',
//                     delay: 1000 // Start with 1s delay, then 2s, 4s...
//                 }
//             });
            
//             logger.logTrade({ 
//                 type: "STRATEGY_SIGNAL", 
//                 strategyId, 
//                 signal 
//             });
//         }
//     } catch (err) {
//         logger.logError(err, { 
//             context: "strategyWorker", 
//             jobId: job.id 
//         });
//         throw err; // Retry job on error
//     }
// }, { 
//     connection,
//     concurrency: 5
// });

// // Process trade execution jobs
// const tradeWorker = new Worker('trade-execution', async job => {
//     try {
//         const { signal } = job.data;

//         // signal should include either an exchangeClient or exchangeName + apiKey/apiSecret
//         let exchangeClient = signal.exchangeClient;
//         if (!exchangeClient) {
//             if (signal.exchangeName && signal.apiKey && signal.apiSecret) {
//                 exchangeClient = createAuthenticatedExchange(signal.exchangeName, signal.apiKey, signal.apiSecret);
//             } else {
//                 throw new Error('Trade signal missing exchange client or credentials');
//             }
//         }

//         const { tradeParams, riskParams } = signal;
//         if (!tradeParams || !riskParams) {
//             throw new Error('Trade signal missing tradeParams or riskParams');
//         }

//         await executeTradeWithRisk(exchangeClient, tradeParams, riskParams);
//     } catch (err) {
//         logger.logError(err, { 
//             context: "tradeWorker", 
//             jobId: job.id 
//         });
//         throw err; // Retry job on error
//     }
// }, { 
//     connection,
//     concurrency: 2 // Limit concurrent trades
// });

// // Add error handlers
// strategyWorker.on('error', err => {
//     logger.logError(err, { context: "strategyWorker" });
// });

// tradeWorker.on('error', err => {
//     logger.logError(err, { context: "tradeWorker" });
// });

// // Schedule strategy polling
// const scheduleStrategyPolling = async (strategyId) => {
//     await strategyQueue.add('poll-strategy', { strategyId }, {
//         repeat: {
//             every: 60000 // 1 minute
//         }
//     });
// };

// // Clean up old jobs periodically
// const cleanupOldJobs = async () => {
//     await strategyQueue.clean(24 * 3600 * 1000, 1000); // Remove jobs older than 24h
//     await tradeQueue.clean(24 * 3600 * 1000, 1000);
// };

// // Run cleanup daily
// setInterval(cleanupOldJobs, 24 * 3600 * 1000);

// export { scheduleStrategyPolling, strategyQueue, tradeQueue };