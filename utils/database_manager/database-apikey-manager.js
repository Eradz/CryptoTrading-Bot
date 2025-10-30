import {publicEncrypt, privateDecrypt, constants}  from "crypto"
import { privateKey, publicKey } from "../keys.js";

const OAEP_OPTIONS = {
  padding: constants.RSA_PKCS1_OAEP_PADDING,
  oaepHash: "sha256"
};
// ENCRYPT APIKEY AND APISECRET
export const encryptKey = (key) => {
  const buffer = Buffer.from(key);
  const encrypted = publicEncrypt({key: publicKey, ...OAEP_OPTIONS}, buffer);
  return encrypted.toString("base64");
};

// DECRYPT APIKEY AND APISECRET
export const decryptKey = (encryptedKey) => {
  const buffer = Buffer.from(encryptedKey, "base64");
  const decrypted = privateDecrypt({key: privateKey, ...OAEP_OPTIONS}, buffer);
  return decrypted.toString("utf-8");
};

const databaseApikeyManager = {
  encryptKey,
  decryptKey,
};

export default databaseApikeyManager;