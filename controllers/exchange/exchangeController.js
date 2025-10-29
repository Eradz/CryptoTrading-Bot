import AsyncHandler from "express-async-handler";
import { Exchange } from "../../models/exchangeDetails.js";
import { AppResponse } from "../../utils/index.js";
import { decryptKey, encryptKey } from "../../utils/database_manager/database-apikey-manager.js";
import dotenv from "dotenv"

dotenv.config();
// CREATE EXCHANGE FOR A USER
export const createExchangeController = AsyncHandler(async (req, res) => {

        const {exchangeName, eak, eas} = req.body;
        const userId = req.params.id
        // Validate request data
        if (!exchangeName || !eak || !eas) {
            return AppResponse.error(res, "All fields are required" );
        }

        const encryptedEak = encryptKey(eak);
        const encryptedEas = encryptKey(eas);

        // Create exchange record in the database
        const exchange = await Exchange.create({
            exchangeName,
            eak: encryptedEak,
            eas: encryptedEas,
            userId
        });

        return AppResponse.success(res, "Exchange created successfully", exchange);
   })

   export const getAllExchangesForUserController = AsyncHandler(async (req, res) => {
       const userId = req.params.id;
       // Validate userId
       if (!userId) {
           return AppResponse.error(res, "User ID is required");
       }

       // Fetch all exchanges for the user
       const exchanges = await Exchange.findAll({
           where: { userId }
       });

       if (!exchanges || exchanges.length < 1) {
           return AppResponse.error(res, "No exchanges found for this user");
       }

       return AppResponse.success(res, "Exchanges found", exchanges);
   });

   export const getExchangeByIdController = AsyncHandler(async (req, res) => {
       const { id } = req.params;

       // Validate exchangeId
       if (!id) {
           return AppResponse.error(res, "Exchange ID is required");
       }

       // Fetch exchange by ID
       const exchange = await Exchange.findOne({
           where: { id }
       });

       if (!exchange) {
           return AppResponse.error(res, "Exchange not found");
       }

       return AppResponse.success(res, "Exchange found", exchange);
   });

   export const deleteExchangeController = AsyncHandler(async (req, res) => {
       const { id } = req.params;

       // Validate exchangeId
       if (!id) {
           return AppResponse.error(res, "Exchange ID is required");
       }

       // Delete exchange by ID
       const deleted = await Exchange.destroy({
           where: { id }
       });

       if (!deleted) {
           return AppResponse.error(res, "Exchange not found");
       }

       return AppResponse.success(res, "Exchange deleted successfully");
   });
