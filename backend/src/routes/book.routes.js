// src/routes/book.routes.js
import express from "express";
import { BookController } from "../controllers/book.controller.js";

const router = express.Router();

// Lấy Books
router.get("/", BookController.listPaged);

// Lấy 500 Book
router.get("/500Books", BookController.get500Books);

// Lấy Book theo ID 
router.get("/:bookId", BookController.getBookById);

// Lấy Book theo ISBN
router.get("/isbn/:isbn", BookController.getBookByISBN);

// Lấy Book theo Category ID
router.get("/category/:categoryId", BookController.getBooksByCategory);

// Lấy Book theo Author ID
router.get("/author/:authorId", BookController.getBooksByAuthor);

// // Tìm kiếm sách
router.get("/search/:searchTerm", BookController.searchBooks);

// // Lấy sách available
// router.get("/available/books", BookController.getAvailableBooks);


// Tạo book mới
router.post("/", BookController.create);

// Cập nhật book
router.put("/:bookId", BookController.update);

// Xóa book
router.delete("/:bookId", BookController.remove);

export default router;