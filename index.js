// API
const origin = "http://localhost:3000";

// Server and Database Packages
import dotenv from "dotenv"
import express from "express"
import cors from "cors"
import { connectDB }  from "./db.js"
import {sendEncryptedApiKeyToDB}  from "./utils/database_manager/sendUserEncryptedApiKeyToDB.js"
import AuthRouter from './routes/Auth/AuthRouter.js'
import UserRouter from "./routes/User/UserRoute.js"
import ExchangeRouter from "./routes/Exchange/exchangeRouter.js"
// import {getEncryptedApiKeyFromDBAndDecrypt}  from './controllers/user/getEncryptedApiKeyFromDB.js'
// import AlgorithRouter  from "./routes/algorithms/AlgorithmRoute.js"
// import WalletRouter  from "./routes/wallets/WalletRoute.js"
// import TickerRouter  from "./routes/Ticker/TickerRoute.js"
import { generateKeyPair } from "./utils/generateKeypair.js"
import ccxt from "ccxt"
// const publicBinance = new ccxt.binanceus();
import databaseApikeyManager from "./utils/database_manager/database-apikey-manager.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { getEncryptedApiKeyFromDBAndDecrypt } from "./utils/database_manager/getEncryptedApiKeyFromDB.js";

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

dotenv.config();

// Filtered symbols Binance.US supports
const supportedSymbols = [
  "BTC/USDT",
  "ETH/USDT",
  "BNB/USDT",
  "LTC/USDT",
  "ADA/USDT",
];
connectDB();


const clientKeyPair = generateKeyPair();
const clientPublicKey = clientKeyPair.publicKey;
const clientPrivateKey = clientKeyPair.privateKey;


const dbPublicKey = process.env.DB_PUBLIC_KEY;
// //////////////////////////////////////////
const allUsersRunningAlgos = {};
// //////////////////////////////////////////
app.get("/api/tradelist/", async (req, res) => {
  const userId = req.id
  const api = await getEncryptedApiKeyFromDBAndDecrypt(userId);
  const authedBinance = new ccxt.binanceus({
    apiKey: api.apiKey,
    secret: api.apiSecret,
    enableServerTimeSync: true,
  });
  //to allow for testnet
  authedBinance.setSandboxMode(true);
  await authedBinance.loadMarkets(true);

  Object.keys(authedBinance.markets).filter((symbol) => {
    if (symbol.includes("USDT")) return symbol;
  });
  // get trades from all symbols
  const balance = await authedBinance.fetchBalance();
  const symbolObj = Object.keys(balance.total);
  
  const symbols = symbolObj.map((symbol) => {
    if (symbol === "USDT" || symbol === "BUSDT") return;
    return symbol + "/USDT";
  });
  
  const trades = [];
  for (let i = 0; i < symbols.length; i++) {
    if (symbols[i] === undefined || !supportedSymbols.includes(symbols[i]))
      continue;
    const symbol = symbols[i];
    const tradesForSymbol = await authedBinance.fetchOrders(
      symbol,
      undefined,
      5
    );
    if (tradesForSymbol.length === 0) continue;
    tradesForSymbol.forEach((trade) => {
      trades.push(trade);
    });
  }

  const parsedTrades = trades.map((trade) => {
    let { side, symbol, amount, timestamp } = trade;

    amount = amount.toFixed(2);
    return {
      side,
      symbol,
      amount,
      timestamp,
    };
  });
  const tradesSortedByDate = parsedTrades.sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  res.send(tradesSortedByDate);
});
// Authentication Endpoints
app.use("/api/v1/auth", AuthRouter);
// User Endpoints
app.use("/api/v1/users", UserRouter);
// Exchange Endpoints
app.use("/api/v1/exchange", ExchangeRouter);

// // ALGORITHM ENDPOINTS
// app.use("/api/algo/", AlgorithRouter)
// //Wallet endpoints
// app.use("/api/", WalletRouter);

// // // PUBLIC API
// //Binance Ticker&Candle Data
// app.use("/api/binance", TickerRouter);

// ////////////////////////////////////////////////////
// API KEY ENCRYPTION HANDLING/ AuthForm.js ENDPOINTS

// SEND PUBLIC ENCRYPTION KEY TO CLIENT
app.post("/api/client-public-key", (req, res) => {
  res.send({ publicKey: clientPublicKey });
});

// GET AND DECRYPT API KEY AND SECRET FROM CLIENT
app.post("/api/encrypt-api-key", express.json(), async (req, res) => {
  const encryptedApiKey = req.body.encryptedApiKey;
  const encryptedApiSecret = req.body.encryptedApiSecret;
  const email = req.body.email;
  const clientApiKey = databaseApikeyManager.decryptKey(
    encryptedApiKey,
    clientPrivateKey
  );
  const clientApiSecret = databaseApikeyManager.decryptKey(
    encryptedApiSecret,
    clientPrivateKey
  );
  const authedBinance = new ccxt.binanceus({
    apiKey: clientApiKey,
    secret: clientApiSecret,
  });
  authedBinance.setSandboxMode(true);
  try {
    await authedBinance.fetchBalance();
  } catch (e) {
    console.log(e);
    return res.send("error");
  }

  // ENCRYPT API KEY AND SECRET AND SEND TO DATABASE
  try {
    await sendEncryptedApiKeyToDB(
      dbPublicKey,
      clientApiKey,
      clientApiSecret,
      email,
      client
    );
    res.send("ok");
  } catch (e) {
    console.log(e);
  }
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
