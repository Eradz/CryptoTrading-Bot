export const getEncryptedApiKeyFromDBAndDecrypt = async (
  email,
  privateKey,
  client
) => {
  const collection = await client.db("arwis").collection("users");
  try {
    const user = await collection.find({ email: email }).toArray();
    const encryptedApiKey = user[0].apiKey;
    const encryptedApiSecret = user[0].apiSecret;
    const apiKey = decryptKey(encryptedApiKey, privateKey);
    const apiSecret = decryptKey(encryptedApiSecret, privateKey);
    return { apiKey, apiSecret };
  } catch (e) {
    console.log(e);
  }
};