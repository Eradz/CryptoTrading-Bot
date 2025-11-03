import AsyncHandler from "express-async-handler";
import { AppResponse } from "../../utils/index.js";
import { AuthenticateExchange } from "../../utils/AuthenticateExchange.js";
import { trade } from "../../utils/trade/trade.js";
import { RSI_SMA_MACD_COLLABStrategies } from "../../utils/strategies/RSI/RSIstrategy.js";

export const createTradeOrder = AsyncHandler(async (req, res) => {
    const { symbol, side, type, amount, price } = req.body;
    const userId = req.params.id
    const exchangeId = req.params.exchangeId
    if(!userId || !exchangeId) {
        return AppResponse.error(res, "User ID and Exchange ID are required");
    }
    const authenticatedExchange = await AuthenticateExchange({ userId, exchangeId });
    /*
    symbol=  btc
    side = buy
    amunt = number
    type = limit
    price = 
    */
   const OHLCV = await authenticatedExchange.fetchOHLCV(symbol);
   const closes = OHLCV.map(candle => candle[4]);
   const RSI_SMA_MACD = RSI_SMA_MACD_COLLABStrategies(closes);
    // const order = await trade(symbol, side, amount, authenticatedExchange, type, price);
    AppResponse.success(res, "Order created successfully", RSI_SMA_MACD);
});