// API
const origin = [ "https://cryptotrading-bot.onrender.com", "http://localhost:3000", "http://127.0.0.1:3000"];

// Server and Database Packages
import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import swaggerUi from 'swagger-ui-express'
import { specs } from './swagger.js'
import { connectDB }  from "./db.js"
import AuthRouter from './routes/Auth/AuthRouter.js'
import UserRouter from "./routes/User/UserRoute.js"
import ExchangeRouter from "./routes/Exchange/ExchangeRouter.js"
import TradeRouter from "./routes/Trade/TradeRoute.js"
import PortfolioRouter from "./routes/portfolio/PortfolioRoute.js"
import { errorHandler } from "./middleware/errorHandler.js"

// EXPRESS SERVER INITIALIZATION
export const app = express();
const port = process.env.PORT || 5001;
const corsOptions = {
  origin: origin,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-themes@3.0.0/themes/3.x/theme-material.css'
}));

dotenv.config();
connectDB();

// Authentication Endpoints
app.use("/api/v1/auth", AuthRouter);
// User Endpoints
app.use("/api/v1/users", UserRouter);
// Exchange Endpoints
app.use("/api/v1/exchange", ExchangeRouter);

// Filtered symbols Binance.US supports
const supportedSymbols = [
  "BTC/USDT",
  "ETH/USDT",
  "BNB/USDT",
  "LTC/USDT",
  "ADA/USDT",
];

// Authentication Endpoints
app.use("/api/v1/auth", AuthRouter);
// User Endpoints
app.use("/api/v1/users", UserRouter);
// Exchange Endpoints
app.use("/api/v1/exchange", ExchangeRouter);
// Trade Endpoints
app.use("/api/v1/trade", TradeRouter);
// Portfolio Endpoints
app.use("/api/v1/portfolio", PortfolioRouter);
// // // PUBLIC API
// //Binance Ticker&Candle Data
// app.use("/api/binance", TickerRouter);

// ////////////////////////////////////////////////////
// API KEY ENCRYPTION HANDLING/ AuthForm.js ENDPOINTS

// SEND PUBLIC ENCRYPTION KEY TO CLIENT
app.post("/api/client-public-key", (req, res) => {
  res.send({ publicKey: clientPublicKey });
});

app.on("uncaughtException", function (err) {
  console.log(err);
});
//Error Handling Middleware
app.use(errorHandler);

// START SERVER LISTENER
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
