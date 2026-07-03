import { Request, Response } from "express";
import { promises as fs } from "fs";
import path from "path";
import Product from "../database/models/productModel";
import Category from "../database/models/categoryModel";

interface ProductRequest extends Request {
    file?: Express.Multer.File
}

class productController {
    async createProduct(req: ProductRequest, res: Response):Promise<void>{
        const {productName, productDescription, productPrice, productTotalStock, discount, categoryId} = req.body;
        const filename = req.file ? req.file.filename : "https://unsplash.com/s/photos/product";
        if(!productName || !productDescription || !productPrice || !productTotalStock || !categoryId){
            res.status(400).json({
                message : "Some Fields are MIssing!"
            })
            return
        }
        const product= await Product.create({
            productName,
            productDescription,
            productPrice,
            productTotalStock,
            discount : discount || 0,
            categoryId,
            productImageUrl : filename
        })
        res.status(200).json({
            message : "Product Added Successfully!",
            data: product
        })
    }

    async getAllProducts(req : Request, res : Response):Promise<void>{
        const datas = await Product.findAll({
            include : [
                {
                    model : Category,
                    attributes: ['id', 'categoryName'] //reducing overfetching
                }
            ]
        })
        res.status(200).json({
            message : "Products fetched successfully!",
            data : datas
        })
    }
     
    async getSingleProduct(req : Request, res: Response):Promise<void>{
        const {id} = req.params;
        const datas = await Product.findAll({
            where : {
                id : id
            },
            include : [
                {
                    model : Category,
                    attributes: ['id', 'categoryName']
                }
            ]
        })
        res.status(200).json({
            message : "Product Fetched Successfully!",
            data : datas
        })
    }

    async updateProduct(req: ProductRequest, res: Response): Promise<void> {
        const { id } = req.params;
        const { productName, productDescription, productPrice, productTotalStock, discount, categoryId } = req.body;
        const product = await Product.findOne({ where: { id } });

        if (!product) {
            res.status(404).json({ message: "No product with that id" });
            return;
        }

        const updates: { [key: string]: unknown } = {};
        if (typeof productName !== 'undefined') updates.productName = productName;
        if (typeof productDescription !== 'undefined') updates.productDescription = productDescription;
        if (typeof productPrice !== 'undefined') updates.productPrice = productPrice;
        if (typeof productTotalStock !== 'undefined') updates.productTotalStock = productTotalStock;
        if (typeof discount !== 'undefined') updates.discount = discount;
        if (typeof categoryId !== 'undefined') updates.categoryId = categoryId;

        if (req.file) {
            const filename = req.file.filename;
            updates.productImageUrl = filename;

            const imageUrl = product.productImageUrl;
            if (imageUrl && !imageUrl.startsWith('http')) {
                const imagePath = path.join(__dirname, '../uploads', imageUrl);
                try {
                    await fs.unlink(imagePath);
                } catch (error) {
                    console.log("Error deleting old image!");
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            res.status(400).json({ message: "No update data provided." });
            return;
        }

        await product.update(updates);

        res.status(200).json({
            message: "Product updated Successfully!",
            data: product
        });
    }

    async deleteProduct(req : Request, res: Response):Promise<void>{
        const {id} = req.params;
        const product = await Product.findOne({
            where : {
                id : id
            }
        })
        if(!product){
            res.status(404).json({
                message : "No product with that id"
            })
            return
        }
        const imageUrl = product.productImageUrl;
        if(imageUrl && !imageUrl.startsWith('http')){
            const imagePath = path.join(__dirname, '../uploads', imageUrl);
            try{
                await fs.unlink(imagePath);
            } catch (error) {
               console.log("Error deleting image!");
               
            }
        }
        await Product.destroy({
            where : {
                id : id
            }
        })
        res.status(200).json({
            message : "Product deleted Successfully!",
            data : product
        })
    }
}

export default new productController