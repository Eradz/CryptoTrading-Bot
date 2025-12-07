
import AsyncHandler from "express-async-handler"
import { User } from "../../models/userModel.js"
import  Jwt  from "jsonwebtoken"
import { AppResponse } from "../../utils/AppResponse.js"


export const sessionController = AsyncHandler(async (req, res) => {
     const {access_token} = req?.cookies
    if (!access_token || access_token === undefined) {
        AppResponse.error(res, "Access token is required")
    }
    
        const decoded = Jwt.verify(access_token, process.env.JWT_SECRET ? process.env.JWT_SECRET : "")
        const userId = decoded.userId
        
    if(!userId) {   
        AppResponse.error(res, "No access token, Please login")
    }
    const user = await User.findOne({
        where: { id: userId },
        attributes: ['id', 'username', 'email']
    })

    if(!user ) {return AppResponse.error(res, "Unauthorized User")}
    return AppResponse.success(res, "User found successfully", user)
})