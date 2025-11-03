import ccxt from "ccxt";
import { logger } from "../monitoring/monitoring.js";

const createPublicExchange = (exchangeName) => {
    return new ccxt[exchangeName.toLowerCase()]();
};

const createAuthenticatedExchange = (exchangeName, apiKey, apiSecret) => {
    const exchange = new ccxt[exchangeName.toLowerCase()]({
        apiKey,
        secret: apiSecret,
        enableRateLimit: true
    });
    exchange.setSandboxMode(true);
    return exchange;
};

const calculatePortfolioValue = async (balances, exchange) => {
    try {
        let portfolioValue = 0;
        const prices = await exchange.fetchTickers();

        // Handle different exchange balance formats
        const balancesArray = Array.isArray(balances) ? balances : 
                            balances.info?.balances || 
                            Object.entries(balances.total).map(([asset, amount]) => ({
                                asset,
                                free: amount,
                                locked: balances.used?.[asset] || 0
                            }));

        for (const balance of balancesArray) {
            const asset = balance.asset || balance.currency || balance[0];
            const free = parseFloat(balance.free || balance[1] || 0);
            const locked = parseFloat(balance.locked || balance.used || 0);
            const total = free + locked;

            if (asset === "USDT") {
                portfolioValue += total;
                continue;
            }

            if (total > 0) {
                const ticker = prices[`${asset}/USDT`];
                if (ticker) {
                    const price = ticker.last || ticker.close || ticker.info?.lastPrice;
                    if (price) {
                        portfolioValue += total * parseFloat(price);
                    }
                }
            }
        }

        return portfolioValue;
    } catch (error) {
        logger.logError(error, { context: 'calculatePortfolioValue' });
        throw error;
    }
};

const getPortfolioValue = async (exchangeName, apiKey, apiSecret) => {
    try {
        const exchange = createAuthenticatedExchange(exchangeName, apiKey, apiSecret);
        const balances = await exchange.fetchBalance();
        const portfolioValue = await calculatePortfolioValue(balances, exchange);
        return portfolioValue;
    } catch (error) {
        logger.logError(error, { context: 'getPortfolioValue', exchangeName });
        throw error;
    }
};

const getPortfolioDistribution = async (exchangeName, apiKey, apiSecret) => {
    try {
        const exchange = createAuthenticatedExchange(exchangeName, apiKey, apiSecret);
        const balances = await exchange.fetchBalance();
        const portfolioValue = await calculatePortfolioValue(balances, exchange);
        const prices = await exchange.fetchTickers();
        const portfolioDistribution = [];

        // Handle different exchange balance formats
        const balancesArray = Array.isArray(balances) ? balances : 
                            balances.info?.balances || 
                            Object.entries(balances.total).map(([asset, amount]) => ({
                                asset,
                                free: amount,
                                locked: balances.used?.[asset] || 0
                            }));

        for (const balance of balancesArray) {
            const asset = balance.asset || balance.currency || balance[0];
            const free = parseFloat(balance.free || balance[1] || 0);
            const locked = parseFloat(balance.locked || balance.used || 0);
            const total = free + locked;

            if (total > 0) {
                let assetValue = 0;
                if (asset === "USDT") {
                    assetValue = total;
                } else {
                    const ticker = prices[`${asset}/USDT`];
                    if (ticker) {
                        const price = ticker.last || ticker.close || ticker.info?.lastPrice;
                        if (price) {
                            assetValue = total * parseFloat(price);
                        }
                    }
                }

                if (assetValue > 0) {
                    const assetPercentage = (assetValue / portfolioValue) * 100;
                    portfolioDistribution.push({
                        asset,
                        value: assetValue,
                        percentage: assetPercentage,
                        holdings: total
                    });
                }
            }
        }

        return portfolioDistribution;
    } catch (error) {
        logger.logError(error, { context: 'getPortfolioDistribution', exchangeName });
        throw error;
    }
};

export {
    getPortfolioValue,
    getPortfolioDistribution,
    createPublicExchange,
    createAuthenticatedExchange
};
