import JSEncrypt  from "node-jsencrypt"

// ENCRYPT APIKEY AND APISECRET
const encryptKey = (key, publicKey) => {
  const encrypt = new JSEncrypt();
  encrypt.setPublicKey(publicKey);
  const encryptedKey = encrypt.encrypt(key);
  return encryptedKey;
};

// DECRYPT APIKEY AND APISECRET
const decryptKey = (encryptedKey, privateKey) => {
  const decrypt = new JSEncrypt();
  decrypt.setPrivateKey(privateKey);
  const decryptedKey = decrypt.decrypt(encryptedKey);
  return decryptedKey;
};


// DELETE USER FROM DATABASE
const deleteUserFromDB = async (email, client) => {
  const collection = client.db("arwis").collection("users");
  try {
    await collection.deleteOne({ email: email });
  } catch (e) {
    console.log(e);
  }
};
const databaseApikeyManager = {
  deleteUserFromDB,
  encryptKey,
  decryptKey,
};

export default databaseApikeyManager;