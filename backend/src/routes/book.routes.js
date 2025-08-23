// src/routes/book.routes.js
import express from "express";
import { BookController } from "../controllers/book.controller.js";

const router = express.Router();

// Lấy tất cả Book
router.get("/", BookController.getAllBooks);

// Lấy tất cả Category
router.get("/categories", BookController.getAllCategories);

// Lấy Book theo ID
router.get("/:bookId", BookController.getById);

// Lấy Book theo ISBN
router.get("/isbn/:isbn", BookController.getBookByISBN);

// Lấy Book theo Category
router.get("/category/:category", BookController.getBooksByCategory);

// Lấy Book theo Author
router.get("/author/:author", BookController.getBooksByAuthor);

router.post("/", BookController.create);
router.put("/:bookId", BookController.update);
router.delete("/:bookId", BookController.remove);





export default router;
