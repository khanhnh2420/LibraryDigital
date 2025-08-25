// src/routes/category.routes.js
import express from "express";
import { CategoryController } from "../controllers/category.controller.js";

const router = express.Router();

// Lấy tất cả categories
router.get("/", CategoryController.getAllCategories);

// // Lấy category theo ID
// router.get("/:categoryId", CategoryController.getCategoryById);

// // Lấy sách theo category
// router.get("/:categoryId/books", CategoryController.getBooksByCategory);

// // Tìm kiếm categories
// router.get("/search/:searchTerm", CategoryController.searchCategories);

// // Lấy popular categories
// router.get("/popular/:limit?", CategoryController.getPopularCategories);

// // Tạo category mới
// router.post("/", CategoryController.create);

// // Cập nhật category
// router.put("/:categoryId", CategoryController.update);

// // Xóa category
// router.delete("/:categoryId", CategoryController.remove);

console.log('✅ Categories loaded successfully');

export default router;