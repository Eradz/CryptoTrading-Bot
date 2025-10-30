import express from "express"
import dotenv  from "dotenv"
import { loginController } from "../../controllers/auth/loginUser.js"
import { signupController } from "../../controllers/auth/signUpUser.js"
import { upload } from "../../utils/multer.js"
dotenv.config()


const route = express.Router();

route.post('/signup', [upload.none()] ,signupController)
route.post('/login', [upload.none()] , loginController)


export default route;