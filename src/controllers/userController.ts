import { Request, Response } from "express";
import User from "../database/models/userModel";
import sequelize from "../database/connection";
import bcrypt from "bcrypt"
import generateToken from "../services/generateToken";
import generateOtp from "../services/generateOtp";
import sendMail from "../services/sendMail";
import sendResponse from "../services/sendResponse";
import checkOtpExpiration from "../services/checkOtpExpiration";
import findData from "../services/findData";


class UserController {
    static async register(req: Request, res: Response) {
        //incoming user data receive 
        const { username, email, password } = req.body
        if (!username || !email || !password) {
            res.status(400).json({
                message: "Please provide username,email,password"
            })
            return
        }

        //check that email already exist or not
        const [data] = await User.findAll({
            where: {
                email : email
            }
        })
        if(data){
            return res.status(400).json({
                message: "Please try again later!"
            })
        }

        // data --> users table ma insert garne 
        await User.create({
            username,
            email,
            password: bcrypt.hashSync(password, 10),

        })
        await sendMail({
            to: email,
            subject: "Registration Successfull",
            text: `Welcome to Digital Store`
        })
        res.status(201).json({
            message: "User registered successfully"
        })
    }

    static async login(req: Request, res: Response) {
        // accept incoming data --> email, password
        const { email, password } = req.body // password - manish --> hash() --> $234234324fjlsdf
        if (!email || !password) {
            res.status(400).json({
                message: "Please provide email, password"
            })
            return
        }

        // check email exist or not at first 
        // const [user] = await User.findAll({  // find --> findAll --array , findById--> findByPk --Objecct
        //     where: {
        //         email: email,
        //     }
        // })

        const user = await findData(User,email);
        // user --> password --> $234234324fjlsdf
        if (!user) {
            res.status(404).json({
                message: "No user with that email 😭"
            })
        } else {
            // if yes --> email exist -> check password too 
            const isEqual = bcrypt.compareSync(password, user.password)
            if (!isEqual) {
                res.status(400).json({
                    message: "Invalid password 😢"
                })
            } else {
                // if password milyo vane --> token generate(jwt)   
                const token = generateToken(user.id)
                res.status(200).json({
                    message: "Logged in success 🥰",
                    token
                })

            }
        }

    }

    static async handleForgotPassword (req: Request, res:Response){
        const {email} = req.body;
        if(!email){
            res.status(400).json({message : "Please Provide an Email!"})
            return
        }
        const [user] = await User.findAll({
            where : {
                email: email
            }
        })
        if(!user){
            res.status(404).json({
                email : "Email Not Registered"
            })
            return 
        }

        const otp = generateOtp()
        await sendMail({
            to: email,
            subject: "Digital Store Password Reset Request",
            text: `You just request to reset your password. Here is your OTP : ${otp}`
        })
        user.otp = otp.toString()
        user.otpGeneratedTime = Date.now().toString()
        await user.save()
        res.status(200).json({
            message: "OTP sent successfully"
        })
    }

     static async verifyOtp(req:Request,res:Response){
        const {otp,email} = req.body 
        if(!otp || !email){
            sendResponse(res,404, "Please provide otp and email")
            return
        }
        const user = await findData(User,email)
        if(!user){
            sendResponse(res,404,"No user with that email")
            return
        }
        // otp verification 
        const [data] = await User.findAll({
            where : {
                otp, 
                email
            }
        })
        if(!data){
            sendResponse(res,404,'Invalid OTP')
            return
        }
        const otpGeneratedTime = data.otpGeneratedTime
        checkOtpExpiration(res,otpGeneratedTime,120000)
    }

    static async resetPassword(req:Request,res:Response){
        const {newPassword,confirmPassword,email} = req.body 
        if(!newPassword || !confirmPassword || !email){
            sendResponse(res,400,'please provide newPassword,confirmPassword,email,otp')
            return
        }
        if(newPassword !== confirmPassword){
            sendResponse(res,400,'newpassword and confirm password must be same')
            return
        }
        const user = await findData(User,email)
        if(!user){
            sendResponse(res,404,'No email with that user')
        }
        user.password = bcrypt.hashSync(newPassword,12)
        await user.save()
        sendResponse(res,200,"Password reset successfully!!!")

    }

    static async fetchUsers(req:Request,res:Response){
        const users  = await User.findAll({
            attributes : ["id","username","email"]
        })
        res.status(200).json({
            message : "Users fetched successfully", 
            data : users
        })
    }
    static async deleteUser(req:Request,res:Response){
        const {id} = req.params
        if(!id){
            res.status(400).json({
                message : "Please provide Id "
            })
            return
        }
        await User.destroy({
            where : {
                id 
            }
        })
        res.status(200).json({
            message : "Users deleted successfully", 
           
        })
    }

    

}


export default UserController