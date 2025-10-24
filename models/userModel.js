import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const User = sequelize.define("User",{
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    googleId:{
        type: DataTypes.STRING,
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate:{
            isEmail: true
        }
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        validate:{
            isAlpha: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    // role: {
    //     type: DataTypes.STRING,
    //     allowNull: false,
    //     validate:{
    //         isAlpha: true
    //     },
    //     defaultValue: "User"
    // }  
}, {timestamps: true})