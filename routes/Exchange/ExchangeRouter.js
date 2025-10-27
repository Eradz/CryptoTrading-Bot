import express from "express"
import { createExchangeController } from "../../controllers/exchange/exchangeController.js";


const route = express.Router();

// route.get('/', getAllUsersController)
// route.get('/:id',  getUserByIdController)
route.post('/:id',  createExchangeController)
// route.delete('/:id',  deleteUserController)


export default route;