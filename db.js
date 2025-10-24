import { Sequelize } from "sequelize";
import dotenv from "dotenv"
import pg from "pg"

dotenv.config()
export const sequelize = new Sequelize({
  dialect:"postgres",
  dialectModule: pg,
  dialectOptions:{
    ssl:{
      ca:  process.env.PG_CERT,
      require:true,
      rejectUnauthorized: false
    },
  },
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  username: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE, 
  define:{
    freezeTableName:true
  },
  logging: false
})
export const connectDB = async ()=>{
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true })
        console.log('Connection has been established successfully.');
      } catch (error) {
        console.error('Unable to connect to the database:', error);
      }
}