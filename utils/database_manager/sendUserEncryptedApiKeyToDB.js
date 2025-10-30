export const sendEncryptedApiKeyToDB = async (
  dbPublicKey,
  clientApiKey,
  clientApiSecret,
  email,
  client
) => {
  try {
    const userApiKey = await encryptKey(clientApiKey, dbPublicKey);
    const userApiSecret = await encryptKey(clientApiSecret, dbPublicKey);

    const collection = client.db("arwis").collection("users");

    collection.updateOne(
      { email: email },
      { $set: { apiKey: userApiKey, apiSecret: userApiSecret } },
      { upsert: true }
    );
  } catch (e) {
    console.log(e);
  }
};