import express from "express"
import { createExchangeController, deleteExchangeController, getAllExchangesForUserController, getExchangeByIdController } from "../../controllers/exchange/exchangeController.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     Exchange:
 *       type: object
 *       required:
 *         - exchangeName
 *         - eak
 *         - eas
 *       properties:
 *         id:
 *           type: integer
 *           description: Exchange ID
 *         userId:
 *           type: integer
 *           description: User ID who owns this exchange
 *         exchangeName:
 *           type: string
 *           description: Name of the exchange (e.g., 'binance', 'coinbase')
 *         eak:
 *           type: string
 *           description: Encrypted API Key
 *         eas:
 *           type: string
 *           description: Encrypted API Secret
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const route = express.Router();

/**
 * @swagger
 * /api/v1/exchange/{id}:
 *   post:
 *     summary: Add a new exchange for a user
 *     tags: [Exchange]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - exchangeName
 *               - eak
 *               - eas
 *             properties:
 *               exchangeName:
 *                 type: string
 *                 description: Name of the exchange
 *               eak:
 *                 type: string
 *                 description: Encrypted API Key
 *               eas:
 *                 type: string
 *                 description: Encrypted API Secret
 *     responses:
 *       200:
 *         description: Exchange created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Exchange created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Exchange'
 *       400:
 *         description: Invalid request or exchange already exists
 */
route.post('/:id', [], createExchangeController);

/**
 * @swagger
 * /api/v1/exchange/{id}:
 *   get:
 *     summary: Get all exchanges for a user
 *     tags: [Exchange]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of exchanges retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Exchanges found
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Exchange'
 *       400:
 *         description: No exchanges found or invalid request
 */
route.get('/:id', [], getAllExchangesForUserController);

/**
 * @swagger
 * /api/v1/exchange/{userId}/{exchangeId}:
 *   get:
 *     summary: Get a specific exchange by ID
 *     tags: [Exchange]
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
 *     responses:
 *       200:
 *         description: Exchange retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Exchange found
 *                 data:
 *                   $ref: '#/components/schemas/Exchange'
 *       400:
 *         description: Exchange not found or invalid request
 */
route.get('/:userId/:exchangeId', getExchangeByIdController);

/**
 * @swagger
 * /api/v1/exchange/{id}:
 *   delete:
 *     summary: Delete an exchange
 *     tags: [Exchange]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Exchange ID to delete
 *     responses:
 *       200:
 *         description: Exchange deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Exchange deleted successfully
 *       400:
 *         description: Exchange not found or invalid request
 */
route.delete('/:id', deleteExchangeController);

export default route;