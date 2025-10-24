import express from "express"
const route = express.Router();
import {startBollingerBands,stopBollingerBands,deleteBollingerBands,restartBollingerBands,}  from "../../controllers/algorithms/bollingerbands/start-bollinger-bands.js"
import {deleteDBAlgo,getDBAlgos,}  from "../../controllers/algorithms/bollingerbands/bollinger-bands-database.js"
import { getEncryptedApiKeyFromDBAndDecrypt }  from "../../controllers/user/getEncryptedApiKeyFromDB.js"


route.post("/get/", express.json(), async (req, res) => {
  const email = req.body.email;
  try {
    const algoData = await getDBAlgos(email, client);
    res.send({ algoData });
  } catch (e) {
    console.log(e);
  }
});

route.post("/delete/", express.json(), async (req, res) => {
  const email = req.body.email;
  const id = req.body.id;
  try {
    const algoData = await deleteDBAlgo(email, client, id);
    deleteBollingerBands(id, email, client);
    if (allUsersRunningAlgos[email]) {
      allUsersRunningAlgos[email][id]
        ? (allUsersRunningAlgos[email][id] = null)
        : null;
    }
    res.send({ algoData });
  } catch (e) {
    console.log(e);
  }
});

route.post("/start/BBands/", express.json(), async (req, res) => {
  const id = req.body.id;
  const email = req.body.email;
  const curPair = req.body.curPair;
  const interval = req.body.variables["Freq:"];
  const period = parseInt(req.body.variables["Period:"]);
  const standardDev = parseFloat(req.body.variables["StdDev:"]);
  const amount = req.body.variables["% Amt:"];

  const api = await getEncryptedApiKeyFromDBAndDecrypt(
    req.body.email,
    dbPrivateKey,
    client
  );
  try {
    const bollingerBandsData = await startBollingerBands(
      id,
      interval,
      curPair,
      period,
      standardDev,
      api.apiKey,
      api.apiSecret,
      amount,
      email,
      client
    );
    const historicalBollingerBands =
      bollingerBandsData.historicalBollingerBands;
    const runningBollingerBands = bollingerBandsData.runningBollingerBands;
    if (!allUsersRunningAlgos[email]) {
      allUsersRunningAlgos[email] = {};
    }
    allUsersRunningAlgos[email][id] = runningBollingerBands[email][id];
    res.send({ historicalBollingerBands });
  } catch (e) {
    console.log(e);
  }
});

route.post("/restart/", express.json(), async (req, res) => {
  const id = req.body.id;
  const email = req.body.email;
  const api = await getEncryptedApiKeyFromDBAndDecrypt(
    req.body.email,
    dbPrivateKey,
    client
  );
  try {
    await restartBollingerBands(id, email, client, api.apiKey, api.apiSecret);
  } catch (e) {
    console.log(e);
  }
  res.send({ message: "restarted" });
});

route.post("/stop/", express.json(), async (req, res) => {
  const id = req.body.id;
  const email = req.body.email;

  try {
    const bollingerBands = await stopBollingerBands(id, email, client);
    res.send({ bollingerBands });
  } catch (e) {
    console.log(e);
  }
});


export default router;;