import AsyncHandler from "express-async-handler";
import { Exchange } from "../../models/exchangeDetails.js";
import { decryptKey } from "./database-apikey-manager.js";
import { AppResponse } from "../AppResponse.js";


export const getEncryptedApiKeyFromDBAndDecrypt = AsyncHandler(async (
  {exchangeId, userId}
) => {
    const exchange = await Exchange.findOne({ where: { id: Number(exchangeId), userId: userId } })

    if(!exchange){
      throw new Error("User's exchange not found");
    }
    const encryptedApiKey = exchange.eak;
    const encryptedApiSecret = exchange.eas;
    const apiKey = decryptKey(encryptedApiKey);
    const apiSecret = decryptKey(encryptedApiSecret);
    if(!apiKey || !apiSecret) {
      throw new Error("Failed to decrypt API keys");
    }
    return { exchangeName: exchange.exchangeName, apiKey, apiSecret };
  
})