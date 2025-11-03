import express from "express";
import {
    getPortfolioValueController,
    getPortfolioDistributionController,
    getPortfolioHistoryController
} from "../../controllers/portfolio/portfolioController.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/portfolio/{id}/{exchangeId}/value:
 *   get:
 *     summary: Get portfolio value for a specific exchange
 *     tags: [Portfolio]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *     responses:
 *       200:
 *         description: Portfolio value retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     value:
 *                       type: number
 *       400:
 *         description: Bad request
 */
router.get('/:id/:exchangeId/value', getPortfolioValueController);

/**
 * @swagger
 * /api/v1/portfolio/{id}/{exchangeId}/distribution:
 *   get:
 *     summary: Get portfolio distribution for a specific exchange
 *     tags: [Portfolio]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *     responses:
 *       200:
 *         description: Portfolio distribution retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     distribution:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           asset:
 *                             type: string
 *                           value:
 *                             type: number
 *                           percentage:
 *                             type: number
 *                           holdings:
 *                             type: number
 *       400:
 *         description: Bad request
 */
router.get('/:id/:exchangeId/distribution', getPortfolioDistributionController);

/**
 * @swagger
 * /api/v1/portfolio/{id}/{exchangeId}/history:
 *   get:
 *     summary: Get portfolio value history
 *     tags: [Portfolio]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d, 1y]
 *         description: Time frame for history
 *     responses:
 *       200:
 *         description: Portfolio history retrieved successfully
 *       400:
 *         description: Bad request
 */
router.get('/:id/:exchangeId/history', getPortfolioHistoryController);

export default router;