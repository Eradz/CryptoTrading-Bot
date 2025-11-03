import ccxt from "ccxt";
import { getEncryptedApiKeyFromDBAndDecrypt } from "./database_manager/getEncryptedApiKeyFromDB.js";

export const AuthenticateExchange = async ({userId, exchangeId}) => {
    const {exchangeName, apiKey, apiSecret} = await getEncryptedApiKeyFromDBAndDecrypt({userId, exchangeId});
    const authedExchange = new ccxt[exchangeName]({
        apiKey: apiKey,
        secret: apiSecret,
        enableServerTimeSync: true,
    });
    //to allow for testnet
    authedExchange.setSandboxMode(true);
    return authedExchange;

}
