import express from "express";
import {
    createBotController,
    getUserBotsController,
    getBotByIdController,
    updateBotController,
    startBotController,
    stopBotController,
    deleteBotController,
    getBotPerformanceController
} from "../../controllers/bot/BotController.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/bots/{userId}/{exchangeId}:
 *   post:
 *     summary: Create a new trading bot
 *     tags: [Bots]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: path
 *         name: exchangeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Exchange ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - strategy
 *               - symbol
 *             properties:
 *               name:
 *                 type: string
 *                 example: "BTC Bot"
 *               strategy:
 *                 type: string
 *                 enum: [RSI_SMA_MACD, BOLLINGER_BANDS, HYBRID]
 *                 example: "RSI_SMA_MACD"
 *               symbol:
 *                 type: string
 *                 example: "BTC/USDT"
 *               interval:
 *                 type: string
 *                 enum: [1m, 5m, 15m, 30m, 1h, 4h, 1d]
 *                 example: "1h"
 *               parameters:
 *                 type: object
 *               riskManagement:
 *                 type: object
 *     responses:
 *       200:
 *         description: Bot created successfully
 *       400:
 *         description: Invalid request
 */
router.post('/:userId/:exchangeId', createBotController);

/**
 * @swagger
 * /api/v1/bots/{userId}:
 *   get:
 *     summary: Get all bots for a user
 *     tags: [Bots]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Bots retrieved successfully
 *       400:
 *         description: Invalid request
 */
router.get('/:userId', getUserBotsController);

/**
 * @swagger
 * /api/v1/bots/bot/{botId}:
 *   get:
 *     summary: Get bot by ID
 *     tags: [Bots]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: botId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bot ID
 *     responses:
 *       200:
 *         description: Bot retrieved successfully
 *       400:
 *         description: Bot not found
 */
router.get('/bot/:botId', getBotByIdController);

/**
 * @swagger
 * /api/v1/bots/bot/{botId}:
 *   put:
 *     summary: Update bot configuration
 *     tags: [Bots]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: botId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bot ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               strategy:
 *                 type: string
 *               symbol:
 *                 type: string
 *               interval:
 *                 type: string
 *               parameters:
 *                 type: object
 *               riskManagement:
 *                 type: object
 *     responses:
 *       200:
 *         description: Bot updated successfully
 *       400:
 *         description: Invalid request
 */
router.put('/bot/:botId', updateBotController);

/**
 * @swagger
 * /api/v1/bots/bot/{botId}/start:
 *   post:
 *     summary: Start a trading bot
 *     tags: [Bots]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: botId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bot ID
 *     responses:
 *       200:
 *         description: Bot started successfully
 *       400:
 *         description: Error starting bot
 */
router.post('/bot/:botId/start', startBotController);

/**
 * @swagger
 * /api/v1/bots/bot/{botId}/stop:
 *   post:
 *     summary: Stop a trading bot
 *     tags: [Bots]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: botId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bot ID
 *     responses:
 *       200:
 *         description: Bot stopped successfully
 *       400:
 *         description: Error stopping bot
 */
router.post('/bot/:botId/stop', stopBotController);

/**
 * @swagger
 * /api/v1/bots/bot/{botId}:
 *   delete:
 *     summary: Delete a trading bot
 *     tags: [Bots]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: botId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bot ID
 *     responses:
 *       200:
 *         description: Bot deleted successfully
 *       400:
 *         description: Error deleting bot
 */
router.delete('/bot/:botId', deleteBotController);

/**
 * @swagger
 * /api/v1/bots/bot/{botId}/performance:
 *   get:
 *     summary: Get bot performance metrics
 *     tags: [Bots]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: botId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bot ID
 *     responses:
 *       200:
 *         description: Performance retrieved successfully
 *       400:
 *         description: Bot not found
 */
router.get('/bot/:botId/performance', getBotPerformanceController);

export default router;