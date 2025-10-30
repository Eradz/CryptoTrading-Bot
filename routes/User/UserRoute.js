import express from "express"
import dotenv  from "dotenv"
import { upload } from "../../utils/multer.js"
import { deleteUserController, getAllUsersController, getUserByIdController, updateUserController } from "../../controllers/user/userController.js"
dotenv.config()


const route = express.Router();

route.get('/', [upload.none()] ,getAllUsersController)
route.get('/:id', [upload.none()] , getUserByIdController)
route.post('/:id', [upload.none()] , updateUserController)
route.delete('/:id', [upload.none()] , deleteUserController)


export default route;