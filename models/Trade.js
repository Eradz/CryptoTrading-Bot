import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const Trade = sequelize.define('Trade', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    exchangeOrderId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    strategyId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false
    },
    side: {
        type: DataTypes.ENUM('buy', 'sell'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'open', 'filled', 'partially_filled', 'cancelled', 'failed', 'closed'),
        defaultValue: 'pending'
    },
    quantity: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    executedQty: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    avgExecutedPrice: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    cost: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    fee: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    feeCurrency: {
        type: DataTypes.STRING,
        defaultValue: 'USDT'
    },
    stopLoss: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    takeProfit: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    riskPercentage: {
        type: DataTypes.FLOAT,
        defaultValue: 1
    },
    riskRewardRatio: {
        type: DataTypes.FLOAT,
        defaultValue: 2
    },
    profitLoss: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    profitLossPercent: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    filledAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    closedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    exchangeResponse: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Full response from exchange API'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

export default Trade;
