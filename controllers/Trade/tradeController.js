import AsyncHandler from "express-async-handler";
import { AppResponse } from "../../utils/index.js";
import { AuthenticateExchange } from "../../utils/AuthenticateExchange.js";
import { trade } from "../../utils/trade/trade.js";

export const createTradeOrder = AsyncHandler(async (req, res) => {
    const { symbol, side, type, amount, price } = req.body;
    const userId = req.params.id
    const exchangeId = req.params.exchangeId
    if(!userId || !exchangeId) {
        return AppResponse.error(res, "User ID and Exchange ID are required");
    }
    const authenticatedExchange = await AuthenticateExchange({ userId, exchangeId });
    const order = await trade(symbol, side, amount, authenticatedExchange, type, price);
    AppResponse.success(res, "Order created successfully", order);
});