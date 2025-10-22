// API

// //////////////////////////////////////////

const origin = "https://arwis.up.railway.app";
// const origin = "http://localhost:3000";

// Server and Database Packages
require("dotenv").config();
const express = require("express");
const cors = require("cors");
// const { connectDB } = require("./db.js");
// const AlgorithRouter = require("./routes/algorithms/AlgorithmRoute.js")
// const WalletRouter = require("./routes/wallets/WalletRoute.js")
// const TickerRouter = require("./routes/Ticker/TickerRoute.js")
const { generateKeyPair } = require("./utils/generateKeypair.js");
const ccxt = require("ccxt");
// const publicBinance = new ccxt.binanceus();
const crypto = require("crypto");
const databaseApikeyManager = require("./modules/database_manager/database-apikey-manager.js");
const { timeStamp } = require("console");

// EXPRESS SERVER INITIALIZATION
const app = express();
const port = process.env.PORT || 5001;
const corsOptions = {
  origin: origin,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.on("uncaughtException", function (err) {
  console.log(err);
});


// Filtered symbols Binance.US supports
const supportedSymbols = [
  "BTC/USDT",
  "ETH/USDT",
  "BNB/USDT",
  "LTC/USDT",
  "ADA/USDT",
];
// connectDB();



const clientKeyPair = generateKeyPair();
const clientPublicKey = clientKeyPair.publicKey;
const clientPrivateKey = clientKeyPair.privateKey;

const dbPublicKey = process.env.DB_PUBLIC_KEY;
const dbPrivateKey = process.env.DB_PRIVATE_KEY;
// //////////////////////////////////////////
const allUsersRunningAlgos = {};
// //////////////////////////////////////////
app.get("/api/tradelist/", express.json(), async (req, res) => {
  // const api = await databaseApikeyManager.getEncryptedApiKeyFromDBAndDecrypt(
  //   req.body.email,
  //   dbPrivateKey,
  //   client
  // );
  const authedBinance = new ccxt.binanceus({
    apiKey: process.env.API_KEY_STAGE,
    secret: process.env.API_SECRET_STAGE,
    enableServerTimeSync: true
    // apiKey: api.apiKey,
    // secret: api.apiSecret,
  });
  //to allow for testnet
  authedBinance.setSandboxMode(true);
  await authedBinance.loadMarkets(true);

  console.log(authedBinance.markets);

  Object.keys(authedBinance.markets).filter((symbol) => {
    if (symbol.includes("USD")) return symbol;
  });
  // get trades from all symbols
  const balance = await authedBinance.fetchBalance();
  const symbolObj = Object.keys(balance.total);
  const symbols = symbolObj.map((symbol) => {
    if (symbol === "USD" || symbol === "BUSD") return;
    return symbol + "/USD";
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
// //////////////////////////////////////////
// // ALGORITHM ENDPOINTS
// app.use("/api/algo/", AlgorithRouter)
// //Wallet endpoints
// app.use("/api/", WalletRouter);

// // // PUBLIC API
// //Binance Ticker&Candle Data
// app.use("/api/binance", TickerRouter);

// ////////////////////////////////////////////////////
// API KEY ENCRYPTION HANDLING/ AuthForm.js ENDPOINTS

// DELETE USER ROUTE
app.post("/api/delete-user", express.json(), async (req, res) => {
  try {
    const email = req.body.email;
    databaseApikeyManager.deleteUserFromDB(email, client);
    res.status(200).send();
  } catch (e) {
    console.log(e);
  }
});

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
    await databaseApikeyManager.sendEncryptedApiKeyToDB(
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

// START SERVER LISTENER

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
