// Encryption packages
import crypto  from "crypto"

// GENERATE RSA ENCRYPTION KEYPAIR FOR CLIENT
const generateKeyPair = () => {
  const keyPair = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });
  return keyPair;
};

export { generateKeyPair };