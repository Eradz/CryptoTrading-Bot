import AsyncHandler from "express-async-handler";
import { Exchange } from "../../models/exchangeDetails.js";
import { decryptKey } from "./database-apikey-manager.js";
import dotenv from "dotenv"

dotenv.config();
const PrivateKey = process.env.PG_CERT;

export const getEncryptedApiKeyFromDBAndDecrypt = AsyncHandler(async (
  userId,
) => {
  try {
    const user = await Exchange.findOne({ userId: userId })
    const encryptedApiKey = user.apiKey;
    const encryptedApiSecret = user.apiSecret;
    const apiKey = decryptKey(encryptedApiKey, PrivateKey);
    const apiSecret = decryptKey(encryptedApiSecret, PrivateKey);
    return { apiKey, apiSecret };
  } catch (e) {
    console.log(e);
  }
})