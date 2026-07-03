import { Request, Response } from "express";
import Order from "../database/models/orderModel";
import OrderDetails from "../database/models/orderDetails";
import {OrderStatus, PaymentMethod, PaymentStatus } from "../globals/types";
import Payment from "../database/models/paymentModel";
import axios from "axios"
import Cart from "../database/models/cartModel";
import Product from "../database/models/productModel";
import Category from "../database/models/categoryModel";

interface Iproduct {
    productId: string,
    productQty: string
}

interface OrderRequest extends Request {
    user: {
        id: string
    }
}

class OrderWithPaymentId extends Order{
  declare paymentId : string | null 
}



class OrderController {
    async createOrder(req: OrderRequest, res: Response): Promise<void> {
        const userId = req.user.id;
        const { phoneNumber, firstName, lastName, email, state, city, zipCode, addressLine, totalAmount, paymentMethod } = req.body;
        const products: Iproduct[] = req.body.products
        console.log(req.body);

        if (!firstName || !lastName || !email || !state || !zipCode || !city || !phoneNumber || !addressLine || !totalAmount || products.length == 0) {
            res.status(400).json({
                message: "Some fields are missing!"
            })
            return
        }
        
        const paymentData = await Payment.create({
            paymentMethod: paymentMethod
        })
         let data;
        const orderData = await Order.create({
            phoneNumber,
            addressLine,
            totalAmount,
            userId: userId,
            firstName,
            lastName,
            email,
            city,
            state,
            zipCode,
            paymentId : paymentData.id
        })

        for (const product of products) {
            data = await OrderDetails.create({
                quantity: product.productQty,
                productId: product.productId,
                orderId: orderData.id
            })

            await Cart.destroy({
                where: {
                    productId: product.productId,
                     userId: userId
                }
            })
        }
       
        if (paymentMethod === PaymentMethod.Khalti) {
            // khalti logic for test integration
            const data = {
                return_url: "http://localhost:5173/",
                website_url: "http://localhost:5173/",
                amount: totalAmount * 100,
                purchase_order_id: orderData.id,
                purchase_order_name: "order_" + orderData.id
            }
            const response = await axios.post("https://dev.khalti.com/api/v2/epayment/initiate/", data, {
                headers: {
                    Authorization: "Key 69e6251ff9df4c14bba4a50e70df4640",
                }
            })
            const khaltiResponse = response.data
            paymentData.pidx = khaltiResponse.pidx
            await paymentData.save()
            res.status(200).json({
                message: "Order created successfully",
                url: khaltiResponse.payment_url,
                pidx: khaltiResponse.pidx,
                data
            })
            return;
        } else if (paymentMethod === PaymentMethod.Esewa) {
            // ESEWA logic

        }
        else {
            res.status(200).json({
                message: "Order created successfully",
                data
            })
            return;
        }
    }




    async verifyTransaction(req: OrderRequest, res: Response): Promise<void> {
        const { pidx } = req.body
        if (!pidx) {
            res.status(400).json({
                message: "Please provide pidx"
            })
            return
        }
        const response = await axios.post("https://a.khalti.com/api/v2/epayment/lookup/", {
            pidx: pidx
        }, {
            headers: {
                "Authorization": "Key 69e6251ff9df4c14bba4a50e70df4640"
            }
        })
        const data = response.data
        if (data.status === "Completed") {
            await Payment.update({ paymentStatus: PaymentStatus.Paid }, {
                where: {
                    pidx: pidx
                }
            })
            res.status(200).json({
                message: "Payment verified successfully !!"
            })
        } else {
            res.status(200).json({
                message: "Payment not verified or cancelled"
            })
        }
    }

     async fetchMyOrders(req:OrderRequest,res:Response):Promise<void>{
      const userId = req.user?.id 
      const orders = await Order.findAll({
        where : {
          userId
        }, 
        attributes : ["totalAmount","id","orderStatus"], 
        include : {
          model : Payment, 
          attributes : ["paymentMethod", "paymentStatus"]
        }
      })
      if(orders.length > 0){
        res.status(200).json({
          message : "Order fetched successfully", 
          data : orders 
        })
      }else{
        res.status(404).json({
          message : "No order found", 
          data : []
        })
      }
    }

    async fetchAllOrders(req:OrderRequest,res:Response):Promise<void>{
      
      const orders = await Order.findAll({
       
        attributes : ["totalAmount","id","orderStatus"], 
        include : {
          model : Payment, 
          attributes : ["paymentMethod", "paymentStatus"]
        }
      })
      if(orders.length > 0){
        res.status(200).json({
          message : "Order fetched successfully", 
          data : orders 
        })
      }else{
        res.status(404).json({
          message : "No order found", 
          data : []
        })
      }
    }

    async fetchMyOrderDetail(req:OrderRequest,res:Response):Promise<void>{
      const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!orderId) {
        res.status(400).json({
          message: "Invalid order id"
        })
        return
      }
      const orders = await OrderDetails.findAll({
        where : {
          orderId, 

        }, 
        include : [{
          model : Order , 
          include : [
            {
              model : Payment, 
              attributes : ["paymentMethod","paymentStatus"]
            }
          ],
          attributes : ["orderStatus","addressLine","city","state","totalAmount","phoneNumber", "firstName", "lastName","userId"]
        },{
          model : Product, 
          include : [{
            model : Category
          }], 
          attributes : ["productImageUrl","productName","productPrice"]
        }]
      })
      if(orders.length > 0){
        res.status(200).json({
          message : "Order fetched successfully", 
          data : orders 
        })
      }else{
        res.status(404).json({
          message : "No order found", 
          data : []
        })
      }
    }

     async cancelMyOrder(req:OrderRequest,res:Response):Promise<void>{
      const userId = req.user?.id 
      const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!orderId) {
        res.status(400).json({
          message: "Invalid order id"
        })
        return
      }
      const [order] = await Order.findAll({
        where : {
          userId : userId, 
          id : orderId 
        }
      })
      if(!order){
        res.status(400).json({
          message : "No order with that Id"
        })
        return 
      }
      // check order status 
      if(order.orderStatus === OrderStatus.Ontheway || order.orderStatus === OrderStatus.Preparation){
        res.status(403).json({
          message : "You cannot cancelled order, it is on the way or preparation mode"
        })
        return
      }
      await Order.update({orderStatus : OrderStatus.Cancelled},{
        where : {
          id : orderId
        }
      })
      res.status(200).json({
        message : "Order cancelled successfully"
      })
    }

     async changeOrderStatus(req:OrderRequest,res:Response) : Promise<void>{
      const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const {orderStatus} = req.body
      if(!orderId || !orderStatus){
        res.status(400).json({
          message : "Please provide orderId and orderStatus"
        })
      }
      await Order.update({orderStatus : orderStatus},{
        where : {
          id : orderId
        }
      })
      res.status(200).json({
        message : "Order status updated successfully"
      })
    }
     async deleteOrder(req:OrderRequest, res:Response) : Promise<void>{

      const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!orderId) {
        res.status(400).json({
          message: "Invalid order id"
        })
        return
      }
      const order : OrderWithPaymentId= await Order.findByPk(orderId as string) as OrderWithPaymentId
      const paymentId = order?.paymentId
      if(!order){
        res.status(404).json({
          message : "You dont have that orderId order"
        })
        return
      }
      await OrderDetails.destroy({
        where : {
          orderId : orderId
        }
      })
      await Payment.destroy({
        where : {
          id : paymentId
        }
      })
      await Order.destroy({
        where : {
          id : orderId
        }
      })
      res.status(200).json({
        message : "Order delete successfully"
      })
    }

}


export default new OrderController
