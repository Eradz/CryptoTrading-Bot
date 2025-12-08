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
        allowNull: true,
    },
    botId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Bot",
            key: "id"
        },
        onDelete: "CASCADE"
    },
    side: {
        type: DataTypes.ENUM('buy', 'sell', "hold"),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'open', 'filled', 'partially_filled', 'cancelled', 'failed', 'closed'),
        defaultValue: 'pending'
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    cost: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    stopLoss: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    takeProfit: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    closedAt: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
}, { 
    timestamps: true
});

export default Trade;
