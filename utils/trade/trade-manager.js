import { trade } from './trade.js';
import { 
    calculatePositionSize, 
    calculateStopLoss, 
    calculateTakeProfit, 
    validateTradeRisk 
} from '../risk-management/position-manager.js';

/**
 * Execute trade with risk management
 * @param {Object} exchangeClient - Authenticated exchange client
 * @param {Object} tradeParams - Trade parameters
 * @param {Object} riskParams - Risk management parameters
 * @returns {Object} Trade result
 */
export const executeTradeWithRisk = async (exchangeClient, tradeParams, riskParams) => {
    try {
        const {
            symbol,
            side,
            type = 'market',
            price
        } = tradeParams;

        const {
            accountBalance,
            riskPercentage,
            riskRewardRatio,
            maxPositionSize,
            maxRiskPerTrade
        } = riskParams;

        // Calculate stop loss
        const stopLoss = calculateStopLoss(side, price, riskPercentage);

        // Calculate position size
        const positionSize = calculatePositionSize(
            accountBalance,
            riskPercentage,
            price,
            stopLoss
        );

        // Calculate take profit
        const takeProfit = calculateTakeProfit(
            side,
            price,
            stopLoss,
            riskRewardRatio
        );

        // Validate trade risk
        const isValidTrade = validateTradeRisk(
            {
                positionSize,
                entryPrice: price,
                stopLoss,
                side
            },
            {
                maxPositionSize,
                maxRiskPerTrade,
                balance: accountBalance
            }
        );

        if (!isValidTrade) {
            throw new Error('Trade does not meet risk management criteria');
        }

        // Execute main trade
        const mainOrder = await trade(
            symbol,
            side,
            positionSize,
            exchangeClient,
            type,
            price
        );

        // Place stop loss order
        const stopOrder = await exchangeClient.createOrder(
            symbol,
            'stop-loss',
            side === 'buy' ? 'sell' : 'buy',
            positionSize,
            undefined,
            {
                stopPrice: stopLoss
            }
        );

        // Place take profit order
        const tpOrder = await exchangeClient.createOrder(
            symbol,
            'take-profit',
            side === 'buy' ? 'sell' : 'buy',
            positionSize,
            takeProfit
        );

        return {
            mainOrder,
            stopOrder,
            tpOrder,
            positionSize,
            entryPrice: price,
            stopLoss,
            takeProfit
        };

    } catch (error) {
        console.error('Error executing trade with risk management:', error);
        throw error;
    }
};