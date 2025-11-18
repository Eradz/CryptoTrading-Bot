import AsyncHandler from "express-async-handler";
import { AppResponse } from "../../utils/AppResponse.js";
import { getPortfolioValue, getPortfolioDistribution } from "../../utils/portfolio/portfolio-analytics.js";
import { getEncryptedApiKeyFromDBAndDecrypt } from "../../utils/database_manager/getEncryptedApiKeyFromDB.js";


import PortfolioSnapshot from "../../models/portfolioSnapshot.js";

// Retrieve portfolio history from Postgres using Sequelize
const getPortfolioHistoryFromDB = async (userId, exchangeId, timeframe = '24h') => {
    // timeframe: e.g., '24h', '7d', '30d' (default: 24h)
    let since = new Date();
    if (timeframe.endsWith('h')) {
        since.setHours(since.getHours() - parseInt(timeframe));
    } else if (timeframe.endsWith('d')) {
        since.setDate(since.getDate() - parseInt(timeframe));
    } else {
        since.setHours(since.getHours() - 24);
    }
    const snapshots = await PortfolioSnapshot.findAll({
        where: {
            userId,
            exchange: exchangeId,
            timestamp: { $gte: since }
        },
        order: [['timestamp', 'ASC']]
    });
    return snapshots.map(s => ({
        timestamp: s.timestamp,
        totalValue: s.totalValue,
        assets: s.assets
    }));
};
// Persist a portfolio snapshot to DB (call periodically)
export const persistPortfolioSnapshot = async ({ userId, exchangeId, assets, totalValue }) => {
    await PortfolioSnapshot.create({
        userId,
        exchange: exchangeId,
        assets,
        totalValue,
        timestamp: new Date()
    });
};

export const getPortfolioValueController = AsyncHandler(async (req, res) => {
    const userId = req.params.id;
    const exchangeId = req.params.exchangeId;

    if (!userId || !exchangeId) {
        return AppResponse.error(res, "User ID and Exchange ID are required");
    }

    try {
        const { exchangeName, apiKey, apiSecret } = await getEncryptedApiKeyFromDBAndDecrypt({
            userId,
            exchangeId
        });

        const portfolioValue = await getPortfolioValue(exchangeName, apiKey, apiSecret);
        return AppResponse.success(res, "Portfolio value retrieved successfully", {
            value: portfolioValue
        });
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
});

export const getPortfolioDistributionController = AsyncHandler(async (req, res) => {
    const userId = req.params.id;
    const exchangeId = req.params.exchangeId;

    if (!userId || !exchangeId) {
        return AppResponse.error(res, "User ID and Exchange ID are required");
    }

    try {
        const { exchangeName, apiKey, apiSecret } = await getEncryptedApiKeyFromDBAndDecrypt({
            userId,
            exchangeId
        });

        const distribution = await getPortfolioDistribution(exchangeName, apiKey, apiSecret);
        return AppResponse.success(res, "Portfolio distribution retrieved successfully", {
            distribution
        });
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
});

export const getPortfolioHistoryController = AsyncHandler(async (req, res) => {
    const userId = req.params.id;
    const exchangeId = req.params.exchangeId;
    const { timeframe = '24h' } = req.query;

    if (!userId || !exchangeId) {
        return AppResponse.error(res, "User ID and Exchange ID are required");
    }

    try {
        // Get portfolio history from database
        const history = await getPortfolioHistoryFromDB(userId, exchangeId, timeframe);
        return AppResponse.success(res, "Portfolio history retrieved successfully", {
            history
        });
    } catch (error) {
        return AppResponse.error(res, error.message);
    }
});