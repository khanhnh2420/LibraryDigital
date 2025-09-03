// src/controllers/book.controller.js
import { CategoryModel } from "../DAO/category.DAO.js";

export const CategoryController = {

    async getAllCategories(req, res) {
        try {
            const categories = await CategoryModel.getAllCategories();
            return res.status(200).json(categories);
        } catch (err) {
            console.error("❌ Lỗi getAll Category:", err);
            return res.status(500).json({ err });
        }
    },

};
