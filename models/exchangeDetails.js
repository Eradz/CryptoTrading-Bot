import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const Exchange = sequelize.define("Exchange",{
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    userId:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references:{
            model: "User",
            key: "id"
        }
    },
    eak: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    eas: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    exchangeName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
}, {timestamps: true})