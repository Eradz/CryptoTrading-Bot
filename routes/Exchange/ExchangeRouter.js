import express from "express"
import { createExchangeController, deleteExchangeController, getAllExchangesForUserController, getExchangeByIdController } from "../../controllers/exchange/exchangeController.js";


const route = express.Router();


route.post('/:id', [], createExchangeController)
route.get('/:id', [], getAllExchangesForUserController)
route.get('/:id',  getExchangeByIdController)
route.delete('/:id',  deleteExchangeController)


export default route;