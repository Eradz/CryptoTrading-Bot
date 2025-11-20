import { logger } from "../monitoring/monitoring.js";

/**
 * Execute a trade on the exchange
 * @param {string} symbol - Trading pair (e.g., BTC/USDT)
 * @param {string} side - Trade side (buy/sell)
 * @param {number} amount - Amount to trade (in base currency)
 * @param {Object} exchange - Authenticated exchange instance
 * @param {string} type - Order type (market/limit)
 * @param {number} price - Price for limit orders
 * @returns {Object} Order result
 */
export const trade = async (symbol, side, amount, exchange, type = "market", price = null) => {
    try {
        // Validate inputs
        if (!symbol || !side || !amount || !exchange) {
            throw new Error("Missing required parameters");
        }

        // Get market information
        const markets = await exchange.loadMarkets();
        const market = markets[symbol];

        if (!market) {
            throw new Error(`Market ${symbol} not found`);
        }

        // Get precision and limits
        const { limits, precision } = market;
        const minAmount = limits.amount.min;
        const maxAmount = limits.amount.max;

        // Adjust amount to meet exchange requirements
        let adjustedAmount = parseFloat(amount);

        // Check minimum amount
        if (adjustedAmount < minAmount) {
            throw new Error(`Amount ${adjustedAmount} is below minimum ${minAmount}`);
        }

        // Check maximum amount
        if (maxAmount && adjustedAmount > maxAmount) {
            adjustedAmount = maxAmount;
            logger.logTrade({
                type: "AMOUNT_ADJUSTMENT",
                symbol,
                originalAmount: amount,
                adjustedAmount: maxAmount,
                reason: "Exceeded maximum"
            });
        }

        // Apply precision
        adjustedAmount = exchange.amountToPrecision(symbol, adjustedAmount);

        // Prepare order parameters
        const orderParams = {
            symbol: symbol,
            type: type,
            side: side,
            amount: adjustedAmount
        };

        // Add price for limit orders
        if (type === "limit") {
            if (!price) {
                throw new Error("Price is required for limit orders");
            }
            orderParams.price = exchange.priceToPrecision(symbol, price);
        }

        // Execute order
        const order = await exchange.createOrder(
            orderParams.symbol,
            orderParams.type,
            orderParams.side,
            orderParams.amount,
            orderParams.price
        );

        // Log successful trade
        logger.logTrade({
            orderId: order.id,
            symbol: order.symbol,
            side: order.side,
            type: order.type,
            amount: order.amount,
            price: order.price || order.average,
            status: order.status,
            timestamp: order.timestamp
        });

        return order;

    } catch (error) {
        logger.logError(error, {
            context: "trade",
            symbol,
            side,
            amount,
            type,
            price
        });
        throw error;
    }
};

/**
 * Calculate trade amount based on percentage of available balance
 * @param {Object} exchange - Authenticated exchange instance
 * @param {string} symbol - Trading pair
 * @param {string} side - Trade side (buy/sell)
 * @param {number} percentage - Percentage of balance to use (1-100)
 * @returns {number} Calculated amount
 */
export const calculateTradeAmount = async (exchange, symbol, side, percentage) => {
    try {
        const balance = await exchange.fetchBalance();
        const [base, quote] = symbol.split("/");

        let availableBalance = 0;

        if (side === "buy") {
            // For buy orders, use quote currency balance
            availableBalance = balance[quote]?.free || 0;
            
            // Get current price
            const ticker = await exchange.fetchTicker(symbol);
            const price = ticker.last || ticker.close;
            
            // Calculate amount in base currency
            const amount = (availableBalance * percentage / 100) / price;
            return amount;
        } else {
            // For sell orders, use base currency balance
            availableBalance = balance[base]?.free || 0;
            
            // Calculate amount
            const amount = availableBalance * percentage / 100;
            return amount;
        }
    } catch (error) {
        logger.logError(error, {
            context: "calculateTradeAmount",
            symbol,
            side,
            percentage
        });
        throw error;
    }
};

/**
 * Execute market order with percentage of balance
 * @param {Object} exchange - Authenticated exchange instance
 * @param {string} symbol - Trading pair
 * @param {string} side - Trade side (buy/sell)
 * @param {number} percentage - Percentage of balance to use
 * @returns {Object} Order result
 */
export const tradeWithPercentage = async (exchange, symbol, side, percentage) => {
    try {
        const amount = await calculateTradeAmount(exchange, symbol, side, percentage);
        return await trade(symbol, side, amount, exchange, "market");
    } catch (error) {
        logger.logError(error, {
            context: "tradeWithPercentage",
            symbol,
            side,
            percentage
        });
        throw error;
    }
};