import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const BacktestResult = sequelize.define('BacktestResult', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    strategyId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    interval: {
        type: DataTypes.STRING,
        allowNull: false
    },
    config: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    metrics: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    trades: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    equity: {
        type: DataTypes.JSONB,
        allowNull: false
    }
});

export default BacktestResult;