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
 *         - symbol
 *         - strategy
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated bot ID
 *         userId:
 *           type: integer
 *           description: User ID who owns this bot
 *         exchangeId:
 *           type: integer
 *           description: Exchange ID to use
 *         name:
 *           type: string
 *           description: Bot name
 *         description:
 *           type: string
 *           description: Bot description
 *         symbol:
 *           type: string
 *           description: Trading pair (e.g., BTC/USDT)
 *         strategy:
 *           type: string
 *           enum: [rsi, bollinger, both]
 *           description: Trading strategy
 *         interval:
 *           type: string
 *           enum: [1m, 5m, 15m, 30m, 1h, 4h, 1d]
 *           description: Timeframe for analysis
 *         isActive:
 *           type: boolean
 *           description: Whether bot is currently running
 *         riskPercentage:
 *           type: number
 *           description: Risk percentage per trade
 *         riskRewardRatio:
 *           type: number
 *           description: Risk reward ratio
 *         amount:
 *           type: number
 *           description: Fixed trade amount (optional)
 *         strategyOptions:
 *           type: object
 *           description: Strategy-specific options
 *         trailingStop:
 *           type: object
 *           description: Trailing stop configuration
 *         customExitRules:
 *           type: object
 *           description: Custom exit rules
 *         totalTrades:
 *           type: integer
 *           description: Total number of trades executed
 *         winningTrades:
 *           type: integer
 *           description: Number of winning trades
 *         totalProfit:
 *           type: number
 *           description: Total profit/loss
 *         lastTradeAt:
 *           type: string
 *           format: date-time
 *           description: Last trade execution time
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
        allowNull: false,
        validate: {
            len: [1, 100]
        }
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    symbol: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true
        }
    },
    strategy: {
        type: DataTypes.ENUM('rsi', 'bollinger', 'both'),
        allowNull: false,
        defaultValue: 'rsi'
    },
    interval: {
        type: DataTypes.ENUM('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'),
        allowNull: false,
        defaultValue: '1h'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    riskPercentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 2.0,
        validate: {
            min: 0.1,
            max: 5.0
        }
    },
    riskRewardRatio: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 2.0,
        validate: {
            min: 1.0,
            max: 10.0
        }
    },
    amount: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: true,
        validate: {
            min: 0
        }
    },
    strategyOptions: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
    },
    trailingStop: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null
    },
    customExitRules: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
    },
    // Performance Tracking
    totalTrades: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    winningTrades: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    totalProfit: {
        type: DataTypes.DECIMAL(20, 8),
        allowNull: false,
        defaultValue: 0
    },
    lastTradeAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    lastError: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['userId', 'isActive']
        },
        {
            fields: ['exchangeId']
        },
        {
            fields: ['symbol']
        }
    ]
});

// Instance methods
Bot.prototype.calculateWinRate = function() {
    if (this.totalTrades === 0) return 0;
    return (this.winningTrades / this.totalTrades) * 100;
};

Bot.prototype.updatePerformance = function(tradeResult) {
    this.totalTrades += 1;
    if (tradeResult.pnl > 0) {
        this.winningTrades += 1;
    }
    this.totalProfit = parseFloat(this.totalProfit) + tradeResult.pnl;
    this.lastTradeAt = new Date();
};