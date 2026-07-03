import adminSeeder from "./adminSeeder";
import app from "./src/app";
import { envConfig } from "./src/config/config";
import categoryController from "./src/controllers/categoryController";
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import User from "./src/database/models/userModel";
import Order from "./src/database/models/orderModel";

function startServer() {
    const port = envConfig.port || 3000
    const server = app.listen(port, () => {
        console.log(`Server is listening to the port ${port}`);
        categoryController.seedCategory()
        adminSeeder()
    })

    const io = new Server(server, {
        cors: {
            origin: "http://localhost:5173"
        }
    })

    let onlineUsers:{socketId:string,userId:string,role:string}[] = []
    let addToOnlineusers = (socketId:string,userId:string,role:string)=>{
        onlineUsers = onlineUsers.filter((user)=>user.userId !== userId)
        onlineUsers.push({socketId,userId,role})
    }
    io.on("connection", (socket) => {
        console.log("connected")
        const {token} = socket.handshake.auth // jwt token 
        console.log(token,"TOKEN")
        if (token) {
            jwt.verify(
                token as string,
                envConfig.jwtSecretKey as string,
                async (err:any, result: any) => {
                    if (err) {
                        socket.emit("error", err)
                        return
                    }

                    const userData = await User.findByPk(result.userId)
                    if (!userData) {
                        socket.emit("error", "No user found with that token")
                        return
                    }
                  //userId grab grnu pryo
                   console.log(socket.id,result.userId,userData.role)
                  addToOnlineusers(socket.id,result.userId,userData.role)
                }
            )
            }else{
                console.log("triggered")
                socket.emit("error","Please provide token")
            }
            console.log(onlineUsers)
        socket.on("updateOrderStatus",async  (data)=> {
            const {status, orderId, userId} = data
            const findUser = onlineUsers.find(user=> user.userId == userId)
            await Order.update(
                {
                    orderStatus : status
                },
               {
                 where : {
                    id : orderId
                }
               } 
            )
            if(findUser){
                 console.log(findUser.socketId,"FS")
                io.to(findUser.socketId).emit("statusUpdated",data)
            }else{
                socket.emit("error", "User is not Online!")
            }
        })
    })
}

startServer()