import express, { Router } from 'express'
import userMiddleware, { Role } from '../middleware/userMiddleware'
import errorHandler from '../services/errorHandler'
import orderController from '../controllers/orderController'
const router:Router = express.Router()

router.route("/")
    .post(userMiddleware.isUserLoggedIn, errorHandler(orderController.createOrder))
    .get(userMiddleware.isUserLoggedIn, userMiddleware.accessTo(Role.Customer), errorHandler(orderController.fetchMyOrders))

router.route("/all").get(userMiddleware.isUserLoggedIn,userMiddleware.accessTo(Role.Admin), errorHandler(orderController.fetchAllOrders))

router.route("/:id")
    .get(userMiddleware.isUserLoggedIn, errorHandler(orderController.fetchMyOrderDetail))
    
router.route("/verify-pidx")
    .post(userMiddleware.isUserLoggedIn,errorHandler(orderController.verifyTransaction))

router.route("/admin/change-status/:id")
    .patch(userMiddleware.isUserLoggedIn,userMiddleware.accessTo(Role.Admin), errorHandler(orderController.changeOrderStatus))

router.route("/admin/delete-order/:id")
    .post(userMiddleware.isUserLoggedIn,userMiddleware.accessTo(Role.Admin), errorHandler(orderController.deleteOrder))
router.route("/cancel-order/:id")
    .patch(userMiddleware.isUserLoggedIn,userMiddleware.accessTo(Role.Customer), errorHandler(orderController.cancelMyOrder))
export default router