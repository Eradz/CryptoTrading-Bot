import express from "express"
import { createTradeOrder } from "../../controllers/Trade/tradeController.js";
const router = express.Router();



router.post("/:id/:exchangeId", createTradeOrder);

export default router;