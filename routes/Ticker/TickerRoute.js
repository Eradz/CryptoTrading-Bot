const express = require("express")
const route = express.Router();
// Exchange packages
const ccxt = require("ccxt");
const publicBinance = new ccxt.binanceus();

// GET TICKER DATA
route.get("/:curPair", async (req, res) => {
  try {
    const ticker = await publicBinance.fetchTicker(req.params.curPair);
    const tickerData = JSON.stringify(ticker);
    res.send(tickerData);
  } catch (e) {
    console.log(e);
  }
});

// GET CANDLESTICK DATA
route.post("/candles", express.json(), async (req, res) => {
  try {
    if (publicBinance.has.fetchOHLCV) {
      // milliseconds
      const candles = await publicBinance.fetchOHLCV(
        req.body.curPair,
        req.body.interval
      );
      res.send({ candles: candles });
    }
  } catch (e) {
    console.log(e);
  }
});

module.exports = route;