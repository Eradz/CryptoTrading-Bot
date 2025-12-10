// API
const origin = [ "https://cryptotrading-bot.onrender.com", "http://localhost:3000", "http://127.0.0.1:3000", "https://trade-b.vercel.app", "http://localhost:8080", "https://trading-bot-frontend-phi.vercel.app"];

// Server and Database Packages
import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import cookieParser from'cookie-parser';
import swaggerUi from 'swagger-ui-express'
import * as Sentry from "@sentry/node"
import { specs } from './swagger.js'
import { connectDB }  from "./db.js"
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { generateKeyPair } from './utils/generateKeypair.js'
import AuthRouter from './routes/Auth/AuthRouter.js'
import UserRouter from "./routes/User/UserRoute.js"
import ExchangeRouter from "./routes/Exchange/ExchangeRouter.js"
import TradeRouter from "./routes/Trade/TradeRoute.js"
import PortfolioRouter from "./routes/portfolio/PortfolioRoute.js"
import StrategyRoute from "./routes/strategies/StrategyRoute.js";
import BacktestRoute from "./routes/backtesting/BacktestRoute.js";
import BotRoute from './routes/bot/BotRoute.js'
import { errorHandler } from "./middleware/errorHandler.js"
import { startStrategyPollingWorker } from "./utils/strategies/strategy-worker.js";
import { startBotPerformanceSyncWorker } from "./utils/bot-performance/bot-performance-sync.js";

// EXPRESS SERVER INITIALIZATION
export const app = express();
const port = process.env.PORT || 5000;

// Initialize Sentry
dotenv.config();
connectDB()

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1
  });
  app.use(Sentry.Handlers.requestHandler());
}

const corsOptions = {
  origin: origin,
  optionsSuccessStatus: 200,
  credentials: true
};
app.use(cookieParser()); 
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-themes@3.0.0/themes/3.x/theme-material.css'
}));

// Basic security headers
app.use(helmet());

// Basic rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Generate temporary client keypair for front-end encryption flow
const clientKeyPair = generateKeyPair();
const clientPublicKey = clientKeyPair.publicKey;
const clientPrivateKey = clientKeyPair.privateKey;

const dbPublicKey = process.env.DB_PUBLIC_KEY;

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
// Strategy Endpoints
// app.use("/api/v1/strategy", StrategyRoute);
// Backtesting Endpoints
app.use("/api/v1/backtest", BacktestRoute);
// Bot Endpoints
app.use("/api/v1/bots", BotRoute);

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
  // startStrategyPollingWorker();
  
  // Start bot performance sync worker (updates performance metrics every 30 seconds)
  // startBotPerformanceSyncWorker(30);
});
