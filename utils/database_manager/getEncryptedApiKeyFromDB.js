import AsyncHandler from "express-async-handler";
import { Exchange } from "../../models/exchangeDetails.js";
import { decryptKey } from "./database-apikey-manager.js";


export const getEncryptedApiKeyFromDBAndDecrypt = AsyncHandler(async (
  userId,
) => {
  try {
    const user = await Exchange.findOne({ where: { userId: userId } })
    const encryptedApiKey = user.eak;
    const encryptedApiSecret = user.eas;
    const apiKey = decryptKey(encryptedApiKey);
    const apiSecret = decryptKey(encryptedApiSecret);
    return { apiKey, apiSecret };
  } catch (e) {
    console.log(e);
  }
})