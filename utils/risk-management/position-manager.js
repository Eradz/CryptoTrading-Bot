import { AppResponse } from "../AppResponse.js";

/**
 * Calculate position size based on account balance and risk percentage
 * @param {number} accountBalance - Current account balance
 * @param {number} riskPercentage - Percentage of account to risk (1 = 1%)
 * @param {number} entryPrice - Entry price of the trade
 * @param {number} stopLoss - Stop loss price
 * @returns {number} Position size in base currency
 */
export const calculatePositionSize = (accountBalance, riskPercentage, entryPrice, stopLoss) => {
    try {
        // Convert risk percentage to decimal
        const riskDecimal = riskPercentage / 100;
        
        // Calculate dollar risk (amount willing to lose)
        const dollarRisk = accountBalance * riskDecimal;
        
        // Calculate price difference for stop loss
        const priceDifference = Math.abs(entryPrice - stopLoss);
        
        // Calculate position size
        const positionSize = dollarRisk / priceDifference;
        
        return positionSize;
    } catch (error) {
        console.error('Error calculating position size:', error);
        throw error;
    }
};

/**
 * Calculate and validate stop loss level
 * @param {string} side - Trade side ('buy' or 'sell')
 * @param {number} entryPrice - Entry price of the trade
 * @param {number} riskPercentage - Percentage willing to risk
 * @returns {number} Stop loss price
 */
export const calculateStopLoss = (side, entryPrice, riskPercentage) => {
    try {
        const stopDistance = entryPrice * (riskPercentage / 100);
        return side === 'buy' 
            ? entryPrice - stopDistance  // Stop loss for long position
            : entryPrice + stopDistance; // Stop loss for short position
    } catch (error) {
        console.error('Error calculating stop loss:', error);
        throw error;
    }
};

/**
 * Calculate take profit level based on risk:reward ratio
 * @param {string} side - Trade side ('buy' or 'sell')
 * @param {number} entryPrice - Entry price of the trade
 * @param {number} stopLoss - Stop loss price
 * @param {number} riskRewardRatio - Desired risk:reward ratio (e.g., 2 for 1:2)
 * @returns {number} Take profit price
 */
export const calculateTakeProfit = (side, entryPrice, stopLoss, riskRewardRatio) => {
    try {
        const riskDistance = Math.abs(entryPrice - stopLoss);
        const rewardDistance = riskDistance * riskRewardRatio;
        
        return side === 'buy'
            ? entryPrice + rewardDistance  // Take profit for long position
            : entryPrice - rewardDistance; // Take profit for short position
    } catch (error) {
        console.error('Error calculating take profit:', error);
        throw error;
    }
};

/**
 * Validate if trade meets risk management criteria
 * @param {Object} trade - Trade object with position details
 * @param {Object} account - Account object with balance and limits
 * @returns {boolean} Whether trade meets risk criteria
 */
export const validateTradeRisk = (trade, account) => {
    try {
        const {
            positionSize,
            entryPrice,
            stopLoss,
            side
        } = trade;
        
        const {
            maxPositionSize,
            maxRiskPerTrade,
            balance
        } = account;

        // Calculate potential loss
        const potentialLoss = Math.abs(entryPrice - stopLoss) * positionSize;
        const riskPercentage = (potentialLoss / balance) * 100;

        // Validate position size
        if (positionSize > maxPositionSize) {
            return false;
        }

        // Validate risk percentage
        if (riskPercentage > maxRiskPerTrade) {
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error validating trade risk:', error);
        throw error;
    }
};