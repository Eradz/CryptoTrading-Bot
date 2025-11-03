import { getPortfolioValueFromBinance, getPortfolioDistributionFromBinance } from './portfolio-analytics.js';
import { logger, alerts } from '../monitoring/monitoring.js';

const createPortfolioManager = (exchangeClient, initialConfig = {}) => {
    let config = {
        rebalanceThreshold: 5, // Percentage deviation to trigger rebalance
        maxSlippage: 0.5, // Maximum allowed slippage percentage
        targetAllocation: {}, // Target allocation percentages
        ...initialConfig
    };

    const getCurrentPortfolio = async () => {
        try {
            const value = await getPortfolioValueFromBinance(
                exchangeClient.apiKey,
                exchangeClient.secret
            );

            const distribution = await getPortfolioDistributionFromBinance(
                exchangeClient.apiKey,
                exchangeClient.secret
            );

            return {
                totalValue: value,
                distribution
            };
        } catch (error) {
            logger.logError(error, { context: 'getCurrentPortfolio' });
            throw error;
        }
    };

    const checkRebalanceNeeded = async () => {
        try {
            const { distribution } = await getCurrentPortfolio();
            const deviations = [];

            for (const asset of distribution) {
                const targetAllocation = config.targetAllocation[asset.asset] || 0;
                const currentAllocation = asset.percentage;
                const deviation = Math.abs(currentAllocation - targetAllocation);

                if (deviation > config.rebalanceThreshold) {
                    deviations.push({
                        asset: asset.asset,
                        currentAllocation,
                        targetAllocation,
                        deviation
                    });
                }
            }

            return deviations.length > 0 ? deviations : false;
        } catch (error) {
            logger.logError(error, { context: 'checkRebalanceNeeded' });
            throw error;
        }
    };

    const calculateRebalanceAmount = (deviation, portfolioValue) => {
        const { currentAllocation, targetAllocation } = deviation;
        const difference = Math.abs(currentAllocation - targetAllocation);
        return (portfolioValue * difference) / 100;
    };

    const rebalancePortfolio = async () => {
        try {
            const deviations = await checkRebalanceNeeded();
            if (!deviations) {
                return { status: 'no_action_needed' };
            }

            const portfolio = await getCurrentPortfolio();
            const rebalanceOrders = [];

            for (const deviation of deviations) {
                const { asset, currentAllocation, targetAllocation } = deviation;
                const amount = calculateRebalanceAmount(deviation, portfolio.totalValue);
                
                if (currentAllocation > targetAllocation) {
                    // Need to sell
                    const order = await exchangeClient.createOrder(
                        `${asset}/USDT`,
                        'market',
                        'sell',
                        amount
                    );
                    rebalanceOrders.push(order);
                } else {
                    // Need to buy
                    const order = await exchangeClient.createOrder(
                        `${asset}/USDT`,
                        'market',
                        'buy',
                        amount
                    );
                    rebalanceOrders.push(order);
                }
            }

            logger.logTrade({
                type: 'rebalance',
                orders: rebalanceOrders
            });

            alerts.notify({
                type: 'REBALANCE',
                orders: rebalanceOrders
            });

            return {
                status: 'rebalanced',
                orders: rebalanceOrders
            };
        } catch (error) {
            logger.logError(error, { context: 'rebalancePortfolio' });
            throw error;
        }
    };

    const setTargetAllocation = async (allocations) => {
        try {
            // Validate allocations total to 100%
            const total = Object.values(allocations).reduce((sum, val) => sum + val, 0);
            if (Math.abs(total - 100) > 0.1) { // Allow 0.1% tolerance
                throw new Error('Target allocations must sum to 100%');
            }

            config = {
                ...config,
                targetAllocation: allocations
            };
            return true;
        } catch (error) {
            logger.logError(error, { context: 'setTargetAllocation' });
            throw error;
        }
    };

    return {
        getCurrentPortfolio,
        checkRebalanceNeeded,
        rebalancePortfolio,
        setTargetAllocation,
        getConfig: () => ({ ...config }) // Getter for current config
    };
};

export { createPortfolioManager };