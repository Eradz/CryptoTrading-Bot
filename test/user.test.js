import { expect } from "chai"; 
import request from "supertest";
import { app } from "../index.js";


describe("User Auth", async()=>{

    it("User Signup Successful", async()=>{
        const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
            email: "anaguchidiebere@gmail.com",
            password: "12345",
            username:"Anagu",
        });
        console.log(res.body);
        expect(res.body.message).equals("Signup successful")
    })

    // it("Wrong email and or password", async()=>{
    //     const res = await request(app)
    //     .post("/api/v1/auth/login")
    //     .send({
    //         email: "chidiebere@gmail.com",
    //         password: "12345",
    //     });
    //     expect(res.status).to.equal(400)
    //     expect(res.body.message).to.equal("Invalid email or password")
    // })

    // it("Login successful", async()=>{
    //     const res = await request(app)
    //     .post("/api/v1/auth/login")
    //     .send({
    //         email: "anaguchidiebere48@gmail.com",
    //         password: "12345",
    //     });
    //     expect(res.status).to.equal(400)
    //     expect(res.body.message).to.equal("Invalid email or password")
    // })

    

    // it("User can not signup with the same email", async()=>{
    //     const res = await request(app)
    //     .post('/api/v1/auth/signup')
    //     .send({
    //         email: "anaguchidiebere@gmail.com",
    //         password: "12345",
    //         lastname:"Anagu",
    //         firstname: "Chidiebere",
    //         role: "User",
    //         address: "Lagos",
    //         phone_number: "08135188556"
    //     });
    //     expect(res.status).equals(400)
    //     expect(res.body.message).equals("User already exists")
    // })

    // it("Get all users", async()=>{
    //     const res = await request(app)
    //     .get("/api/v1/user")
    //     // expect(res.status).equals(200)
    //     expect(res.body.message).equals("Users found")
    // })
})