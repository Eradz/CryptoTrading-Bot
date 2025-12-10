import express from "express"
import { createTradeOrder, getTradeHistory } from "../../controllers/Trade/tradeController.js";
import { validate, tradeValidation } from "../../utils/validation.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/trade/{id}/{exchangeId}:
 *   post:
 *     summary: Execute a trade order
 *     description: |
 *       Execute a trade order with optional strategy-based signal generation.
 *       Can execute based on:
 *       1. Manual trade: Provide symbol, side, type, price
 *       2. Strategy-based: Provide strategyId and optionally symbol
 *       
 *       All trades include:
 *       - Risk management (position sizing, stop-loss, take-profit)
 *       - Order persistence to database
 *       - Automatic reconciliation every 5 minutes
 *     tags:
 *       - Trading
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - name: exchangeId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Exchange ID (e.g., binance, binanceus, kraken)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbol:
 *                 type: string
 *                 example: "BTC/USDT"
 *                 description: Trading pair (required for manual trades)
 *               side:
 *                 type: string
 *                 enum: [buy, sell]
 *                 description: Trade side (required for manual trades, ignored if strategyId provided)
 *               strategyId:
 *                 type: string
 *                 example: "rsi-001"
 *                 description: Strategy ID for strategy-based trades (optional)
 *               type:
 *                 type: string
 *                 enum: [market, limit]
 *                 default: market
 *                 description: Order type
 *               price:
 *                 type: number
 *                 example: 45000
 *                 description: Limit price for limit orders (required if type=limit)
 *               riskPercentage:
 *                 type: number
 *                 default: 1
 *                 description: Risk percentage per trade (1-5%)
 *               riskRewardRatio:
 *                 type: number
 *                 default: 2
 *                 description: Risk-reward ratio for stop-loss and take-profit
 *               maxPositionSize:
 *                 type: number
 *                 description: Maximum position size in base currency
 *               maxRiskPerTrade:
 *                 type: number
 *                 default: 2
 *                 description: Maximum risk percentage per trade
 *           examples:
 *             manualBuy:
 *               value:
 *                 symbol: "BTC/USDT"
 *                 side: "buy"
 *                 type: "market"
 *                 riskPercentage: 1
 *             strategyBased:
 *               value:
 *                 symbol: "BTC/USDT"
 *                 strategyId: "rsi-001"
 *                 riskPercentage: 1
 *     responses:
 *       200:
 *         description: Trade executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Order executed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     trade:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "success"
 *                         tradeRecord:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1
 *                             exchangeOrderId:
 *                               type: string
 *                               example: "12345678"
 *                             userId:
 *                               type: integer
 *                               example: 1
 *                             symbol:
 *                               type: string
 *                               example: "BTC/USDT"
 *                             side:
 *                               type: string
 *                               enum: [buy, sell]
 *                             status:
 *                               type: string
 *                               enum: [pending, open, filled, partially_filled, cancelled, failed]
 *                             quantity:
 *                               type: number
 *                               example: 0.05
 *                             executedQty:
 *                               type: number
 *                               example: 0.05
 *                             price:
 *                               type: number
 *                               example: 45000
 *                             avgExecutedPrice:
 *                               type: number
 *                               example: 45000
 *                             fee:
 *                               type: number
 *                               example: 2.25
 *                             stopLoss:
 *                               type: number
 *                               example: 44100
 *                             takeProfit:
 *                               type: number
 *                               example: 45900
 *                             profitLoss:
 *                               type: number
 *                               nullable: true
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                         positionSize:
 *                           type: number
 *                           example: 0.05
 *                         entryPrice:
 *                           type: number
 *                           example: 45000
 *                         stopLoss:
 *                           type: number
 *                           example: 44100
 *                         takeProfit:
 *                           type: number
 *                           example: 45900
 *                     signal:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         action:
 *                           type: string
 *                           enum: [buy, sell]
 *                         symbol:
 *                           type: string
 *                         price:
 *                           type: number
 *                         reason:
 *                           type: string
 *       400:
 *         description: Invalid request or trade validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User ID and Exchange ID are required"
 *       404:
 *         description: Strategy or exchange not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Strategy rsi-001 not found"
 *       500:
 *         description: Trade execution failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Trade execution failed"
 */
router.post("/:id/:exchangeId", validate(tradeValidation), createTradeOrder);

/**
 * @swagger
 * /api/v1/trade/{botId}:
 *   get:
 *     summary: Get trade history
 *     description: |
 *       Retrieve trade history from the exchange for a specific user and exchange.
 *       Can filter by symbol using query parameters.
 *       
 *       Note: This retrieves orders from the exchange. For database-backed trade analytics,
 *       use the Trade model which includes P&L, statistics, and performance metrics.
 *     tags:
 *       - Trading
 *     parameters:
 *       - name: botId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Bot ID
 *     responses:
 *       200:
 *         description: Trade history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Trade history retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "12345678"
 *                           symbol:
 *                             type: string
 *                             example: "BTC/USDT"
 *                           type:
 *                             type: string
 *                             enum: [market, limit]
 *                           side:
 *                             type: string
 *                             enum: [buy, sell]
 *                           price:
 *                             type: number
 *                             example: 45000
 *                           amount:
 *                             type: number
 *                             example: 0.05
 *                           filled:
 *                             type: number
 *                             example: 0.05
 *                           remaining:
 *                             type: number
 *                             example: 0
 *                           status:
 *                             type: string
 *                             enum: [open, closed, canceled]
 *                           timestamp:
 *                             type: integer
 *                             example: 1699776000000
 *                           datetime:
 *                             type: string
 *                             format: date-time
 *                           average:
 *                             type: number
 *                             nullable: true
 *                           cost:
 *                             type: number
 *                             nullable: true
 *                           fee:
 *                             type: object
 *                             nullable: true
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Exchange not found
 *       500:
 *         description: Failed to retrieve trade history
 */
router.get("/:botId", getTradeHistory);

export default router;