const express = require("express")
const route = express.Router();
const portfolio = require("../../modules/portfolio/portfolio-analytics.js");
const databaseApikeyManager = require("../../modules/database_manager/database-apikey-manager.js");
const databasePortfolioManager = require("../../modules/portfolio/portfolio-database.js");
const databaseWalletManager = require("../../modules/wallets/wallets-database.js");
const { routeendFile } = require("fs");
const { connectDB } = require("./../../db.js");
const { generateKeyPair } = require("../..//utils/generateKeypair.js");databasePortfolioManager.startSetPortfolioValueInDBforEachUser(
  client,
  dbPrivateKey
);

route.post("/set-wallet", express.json(), async (req, res) => {
  const wallet = req.body.wallet;
  const email = req.body.email;
  try {
    await databaseWalletManager.setWalletInDB(email, wallet, client);
  } catch (e) {
    console.log(e);
  }
  res.status(200).send();
});

route.post("/delete-wallet", express.json(), async (req, res) => {
  databaseWalletManager.deleteWalletFromDB(
    req.body.email,
    req.body.curPair,
    client
  );
  res.status(200).send();
});

route.post("/get-wallets", express.json(), async (req, res) => {
  try {
    const wallets = await databaseWalletManager.getWalletsFromDB(
      req.body.email,
      client
    );
    res.send({ wallets });
  } catch (e) {
    console.log(e);
  }
});

// GET WALLET BALANCE
route.post("/wallet", express.json(), async (req, res) => {
  try {
    const api = await databaseApikeyManager.getEncryptedApiKeyFromDBAndDecrypt(
      req.body.email,
      dbPrivateKey,
      client
    );
    const authedBinance = new ccxt.binanceus({
      apiKey: api.apiKey,
      secret: api.apiSecret,
    });
    authedBinance.setSandboxMode(true);
    const currency = req.body.currency;

    const prices = await publicBinance.fetchTickers();
    const price = prices[currency + "/USDT"];

    const allBalance = await authedBinance.fetchBalance();
    if (!allBalance[currency]) {
      return res.send({ walletBalance: 0, walletBalanceToUsd: 0 });
    }
    const walletBalance = allBalance.total[currency];
    const walletBalanceToUsd = (walletBalance * price.last).toFixed(2);

    res.send({ walletBalance, walletBalanceToUsd });
  } catch (e) {
    console.log(e);
  }
});

// GET PORTFOLIO VALUE RECORDS FROM DATABASE ROUTE
route.post("/portfolio-chart", express.json(), async (req, res) => {
  const email = req.body.email;
  try {
    const portfolioValueRecord =
      await databasePortfolioManager.getPortfolioValueRecordsFromDB(
        email,
        client
      );
    res.send({ portfolioValueRecord });
  } catch (e) {
    console.log(e);
  }
});

// PORTFOLIO VALUE ROUTE
route.post("/portfolio-value", express.json(), async (req, res) => {
  try {
    const api = await databaseApikeyManager.getEncryptedApiKeyFromDBAndDecrypt(
      req.body.email,
      dbPrivateKey,
      client
    );
    const apiKey = api.apiKey;
    const apiSecret = api.apiSecret;
    const portfolioValue = await portfolio.getPortfolioValueFromBinance(
      apiKey,
      apiSecret
    );
    res.send({ portfolioValue });
  } catch (e) {
    console.log(e);
  }
});

// SET PORTFOLIO VALUE IN DATABASE ROUTE
route.post("/set-portfolio-value", express.json(), async (req, res) => {
  try {
    const email = req.body.email;
    await databasePortfolioManager.startSetPortfolioValueInDB(
      email,
      client,
      dbPrivateKey
    );
    res.status(200).send();
  } catch (e) {
    console.log(e);
  }
});

// PORTFOLIO DISTRIBUTION ROUTE
route.post("/portfolio-distribution", express.json(), async (req, res) => {
  try {
    const api = await databaseApikeyManager.getEncryptedApiKeyFromDBAndDecrypt(
      req.body.email,
      dbPrivateKey,
      client
    );
    const apiKey = api.apiKey;
    const apiSecret = api.apiSecret;
    const portfolioDistribution =
      await portfolio.getPortfolioDistributionFromBinance(apiKey, apiSecret);

    res.send({ portfolioDistribution });
  } catch (e) {
    console.log(e);
  }
});

module.exports = route;
