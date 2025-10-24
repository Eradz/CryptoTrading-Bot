import express from "express"
import dotenv  from "dotenv"
import { loginController } from "../../controllers/auth/loginUser.js"
import { signupController } from "../../controllers/auth/signUpUser.js"
dotenv.config()


const route = express.Router();

route.post('/signup', signupController)
route.post('/login', loginController)


export default route;