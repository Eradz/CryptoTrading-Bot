import {publicDecrypt,privateEncrypt, generateKeyPairSync, publicEncrypt, privateDecrypt}  from "crypto"

const {privateKey, publicKey} = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem"
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem"
  }
})
// ENCRYPT APIKEY AND APISECRET
export const encryptKey = (key) => {
  const buffer = Buffer.from(key);
  const encrypted = publicEncrypt(publicKey, buffer);
  return encrypted.toString("base64");
};

// DECRYPT APIKEY AND APISECRET
export const decryptKey = (encryptedKey) => {
  const buffer = Buffer.from(encryptedKey, "base64");
  const decrypted = privateDecrypt(privateKey, buffer);
  return decrypted.toString("utf-8");
};


// DELETE USER FROM DATABASE
export const deleteUserFromDB = async (email, client) => {
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