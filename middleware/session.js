import {Response, Request, NextFunction} from "express"
import { AppResponse } from "../common/utils"
import AsyncHandler from "express-async-handler"
import { User } from "../models/userModel"
import  Jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

export const AdminSessionMiddleWare = AsyncHandler(async (req, res, next) => {
    const {access_token} = req?.cookies
    if (!access_token || access_token === undefined) {
        AppResponse.error(res, "Access token is required, Please login again.")
    }
    // interface JwtPayload {
    //     userId: string;
    //     exp: number;
    //     iat: number;
    // }
    
        const decoded = Jwt.verify(access_token, process.env.JWT_SECRET ? process.env.JWT_SECRET : "") 
        const userId = decoded.userId
        
    if(!userId) {   
        AppResponse.error(res, "Invalid access token, Please login again.")
    }
    const user = await User.findByPk(userId)

    const userRole = user ? user.role : AppResponse.error(res, "User with this session not found")

    userRole != "admin" ? AppResponse.error(res, "Unauthorized User") : req.id = userId  ; next()
})

export const UserSessionMiddleWare = AsyncHandler(async (req, res, next) => {
    const {access_token} = req?.cookies
    const {id} = req.params
    if (!access_token || access_token === undefined) {
        AppResponse.error(res, "Access token is required, Please login again.")
    }
    if (!id) {
        return AppResponse.error(res, "Invalid ID");
    }
    // interface JwtPayload {
    //     userId: string;
    //     exp: number;
    //     iat: number;
    // }
    
        const decoded = Jwt.verify(access_token, process.env.JWT_SECRET ? process.env.JWT_SECRET : "") 
        const userId = decoded.userId
        
    if(!userId) {   
        AppResponse.error(res, "Invalid access token, Please login again.")
    }
    const user = await User.findOne({where:{id: userId}})

    if(!user ) {return AppResponse.error(res, "Unauthorized User")}
    if( userId === id){
        next()
        return
    }
    if(user.role === "admin" ){
        req.id = user.id.toString()
        next()
        return
    }
    if(user.id != Number(id)){
        AppResponse.error(res, "Unauthorized User")
        return
    }
})