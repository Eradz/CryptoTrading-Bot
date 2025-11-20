
import { getEncryptedApiKeyFromDBAndDecrypt } from "../../utils/database_manager/getEncryptedApiKeyFromDB.js";
import { getPortfolioValue, extractPortfolioAssets } from "../../utils/portfolio/portfolio-analytics.js";
import { persistPortfolioSnapshot } from "./portfolioController.js";
import UserModel from "../../models/userModel.js";

// Get portfolio value records from Postgres
const getPortfolioValueRecordsFromDB = async (userId, exchangeId, timeframe = "24h") => {
  // Use getPortfolioHistoryFromDB from portfolioController
  const { getPortfolioHistoryFromDB } = await import("./portfolioController.js");
  return await getPortfolioHistoryFromDB(userId, exchangeId, timeframe);
};

// Periodically persist portfolio value in DB for a user/exchange
const startSetPortfolioValueInDB = async (userId, exchangeId) => {
  try {
    // Get decrypted API keys
    const { exchangeName, apiKey, apiSecret } = await getEncryptedApiKeyFromDBAndDecrypt({ userId, exchangeId });
    // Poll and persist every 15 minutes
    setInterval(async () => {
      try {
        const exchange = await import("../../utils/portfolio/portfolio-analytics.js");
        const balances = await exchange.createAuthenticatedExchange(exchangeName, apiKey, apiSecret).fetchBalance();
        const prices = await exchange.createAuthenticatedExchange(exchangeName, apiKey, apiSecret).fetchTickers();
        const totalValue = await exchange.getPortfolioValue(exchangeName, apiKey, apiSecret);
        const assets = exchange.extractPortfolioAssets(balances, prices);
        await persistPortfolioSnapshot({ userId, exchangeId, assets, totalValue });
        console.log(`Portfolio snapshot persisted for user ${userId}, exchange ${exchangeId}`);
      } catch (err) {
        console.error("Error persisting portfolio snapshot:", err);
      }
    }, 1000 * 60 * 15); // 15 minutes
  } catch (e) {
    console.log(e);
  }
};

// Start periodic snapshot for all users (example, not wired to routes)
const startSetPortfolioValueInDBforEachUser = async () => {
  const users = await UserModel.findAll();
  for (const user of users) {
    // You may want to fetch user's exchanges from another model/table
    // For demo, assume user has an array of exchangeIds
    if (user.exchangeIds && Array.isArray(user.exchangeIds)) {
      for (const exchangeId of user.exchangeIds) {
        startSetPortfolioValueInDB(user.id, exchangeId);
      }
    }
  }
};

export {
  getPortfolioValueRecordsFromDB,
  startSetPortfolioValueInDB,
  startSetPortfolioValueInDBforEachUser,
};
