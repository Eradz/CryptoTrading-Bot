import { DataTypes } from 'sequelize';
import { sequelize } from '../db.js';

const Strategy = sequelize.define('Strategy', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false
    },
    params: {
        type: DataTypes.JSONB,
        allowNull: false
    },
    interval: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'stopped', 'paused'),
        defaultValue: 'stopped'
    },
    performance: {
        type: DataTypes.JSONB,
        defaultValue: {
            trades: [],
            winRate: 0,
            profitLoss: 0,
            lastUpdated: null
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'User',
            key: 'id'
        }
    }
});

export default Strategy;