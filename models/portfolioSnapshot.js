import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

const PortfolioSnapshot = sequelize.define("PortfolioSnapshot", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  exchange: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  assets: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  totalValue: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

export default PortfolioSnapshot;
