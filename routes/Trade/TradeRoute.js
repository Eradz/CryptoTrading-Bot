import express from "express"
import { createTradeOrder } from "../../controllers/Trade/tradeController.js";
import { validate, tradeValidation } from "../../utils/validation.js";

const router = express.Router();

router.post("/:id/:exchangeId", validate(tradeValidation), createTradeOrder);

export default router;