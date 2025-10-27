import AsyncHandler from "express-async-handler";
import { Exchange } from "../../models/exchangeDetails.js";
import { AppResponse } from "../../utils/index.js";

// CREATE EXCHANGE FOR A USER
export const createExchangeController = AsyncHandler(async (req, res) => {
        const { exchane_name, eak, esk } = req.body;

        // Validate request data
        if (!exchane_name || !eak || !esk) {
            return AppResponse.error(res, "All fields are required" );
        }

        // Create exchange record in the database
        const exchange = await Exchange.create({
            exchane_name,
            eak,
            eas
        });

        return AppResponse.success(res, "Exchange created successfully", exchange);
   })

   