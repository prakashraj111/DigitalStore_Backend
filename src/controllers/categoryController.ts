import Category from "../database/models/categoryModel"
import { Request, Response } from "express"

class CategoryController {
    categoryData=[
        {
            categoryName : "Elecltronics"
        },
        {
            categoryName : "Groceries"
        },
        {
            categoryName : "Foods"
        }
    ]
    async seedCategory():Promise<void>{
        const datas = await Category.findAll()
        if(datas.length === 0){
            await Category.bulkCreate(this.categoryData)
        }else{
            console.log("categories already Seeded!");
        }
    }

    async addCategory(req: Request, res : Response):Promise<void>{
        const {categoryName} = req.body;
        if(!categoryName){
                res.status(400).json({
                message : "Please Provide category Name"
            })
            return 
        } 
        const category = await Category.create({
            categoryName
        })
        res.status(200).json({
            messsage : "category Created Successfuly",
            data : category
        })
    }

    async getCategories(req: Request, res: Response):Promise<void>{
        const data = await Category.findAll()
        res.status(200).json({
            message: "fetched Categories",
            data
        })
    }

    async deleteCategory(req: Request, res: Response):Promise<void>{
        const {id} = req.params
        if(!id){
            res.status(400).json({
                message : "please provide id to delete"
            })
            return
        }
        const data = await Category.findAll({ // array return
            where : {
                id : id
            }
        })
        // const data = await this.categoryData.findByPk(id) // object return
        if(data.length === 0){
            res.status(404).json({
                message : "No category with that id"
            })
            return
        } 
        await Category.destroy({
            where : {
                id
            }
        })
         res.status(200).json({
                message : "Category Deleted successfully"
        })
    }

    async updateCategory(req: Request, res: Response):Promise<void>{
        const {id} = req.params
        const {categoryName} = req.body
          if(!id || !categoryName){
            res.status(400).json({
                message : "please provide id, categoryName to update"
            })
            return
        }
        const data = await Category.findAll({ 
            where : {
                id : id
            }
        })
        if(data.length === 0){
            res.status(404).json({
                message : "No category with that id"
            })
            return
        } 
        await Category.update({categoryName: categoryName},{
            where : {
                id
            }
        })
        res.status(200).json({
            message:  " Category Updated Successfully!"
        })
    }
}

export default new CategoryController