import AsyncHandler from "express-async-handler";
import { AppResponse } from "../../utils/AppResponse.js";
import { getPortfolioValue, getPortfolioDistribution } from "../../utils/portfolio/portfolio-analytics.js";
import { getEncryptedApiKeyFromDBAndDecrypt } from "../../utils/database_manager/getEncryptedApiKeyFromDB.js";

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