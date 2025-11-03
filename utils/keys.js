import dotenv from "dotenv"

dotenv.config();

export const privateKey = process.env.PRIVATE_KEY;
export const publicKey  = process.env.PUBLIC_KEY;

if (!privateKey || !publicKey) {
  throw new Error("RSA keys missing in .env");
}