import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     Bot:
 *       type: object
 *       required:
 *         - userId
 *         - exchangeId
 *         - name
 *         - strategy
 *         - symbol
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated bot ID
 *         userId:
 *           type: integer
 *           description: User ID who owns this bot
 *         exchangeId:
 *           type: integer
 *           description: Exchange ID the bot trades on
 *         name:
 *           type: string
 *           description: Bot name
 *         strategy:
 *           type: string
 *           enum: [RSI_SMA_MACD, BOLLINGER_BANDS, HYBRID]
 *           description: Trading strategy
 *         symbol:
 *           type: string
 *           description: Trading pair (e.g., BTC/USDT)
 *         interval:
 *           type: string
 *           enum: [1m, 5m, 15m, 30m, 1h, 4h, 1d]
 *           description: Trading interval
 *         isActive:
 *           type: boolean
 *           description: Whether bot is currently running
 *         parameters:
 *           type: object
 *           description: Strategy-specific parameters
 *         riskManagement:
 *           type: object
 *           description: Risk management settings
 *         performance:
 *           type: object
 *           description: Bot performance metrics
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
export const Bot = sequelize.define("Bot", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "User",
            key: "id"
        }
    },
    exchangeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "Exchange",
            key: "id"
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    strategy: {
        type: DataTypes.ENUM('RSI_SMA_MACD', 'BOLLINGER_BANDS', 'HYBRID'),
        allowNull: false,
        defaultValue: 'RSI_SMA_MACD'
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^[A-Z]+\/[A-Z]+$/ // Validates format like BTC/USDT
        }
    },
    interval: {
        type: DataTypes.ENUM('1m', '5m', '15m', '30m', '1h', '4h', '1d'),
        allowNull: false,
        defaultValue: '1h'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    parameters: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            rsi: {
                period: 14,
                overbought: 70,
                oversold: 30
            },
            sma: {
                shortPeriod: 20,
                longPeriod: 200
            },
            macd: {
                fastPeriod: 12,
                slowPeriod: 26,
                signalPeriod: 9
            },
            bollinger: {
                period: 20,
                standardDev: 2
            }
        }
    },
    riskManagement: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            riskPercentage: 1, // 1% per trade
            riskRewardRatio: 2, // 1:2 risk:reward
            maxPositionSize: 10000, // Max position size in USDT
            maxRiskPerTrade: 2, // Max 2% risk per trade
            stopLossPercentage: 2, // 2% stop loss
            takeProfitPercentage: 4 // 4% take profit
        }
    },
    performance: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            totalProfit: 0,
            totalLoss: 0,
            netProfit: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            lastTradeAt: null,
            trades: []
        }
    },
    lastError: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    errorCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    }
}, { 
    timestamps: true,
    indexes: [
        {
            fields: ['userId', 'exchangeId']
        },
        {
            fields: ['isActive']
        }
    ]
});