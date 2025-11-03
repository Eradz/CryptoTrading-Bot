import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - username
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated user ID
 *         googleId:
 *           type: string
 *           description: Google OAuth ID if user signed up with Google
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         username:
 *           type: string
 *           description: User's username
 *         password:
 *           type: string
 *           format: password
 *           description: Hashed password (not returned in responses)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of user creation
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of last update
 *       example:
 *         id: 1
 *         email: "user@example.com"
 *         username: "johndoe"
 *         createdAt: "2025-01-01T00:00:00.000Z"
 *         updatedAt: "2025-01-01T00:00:00.000Z"
 */
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