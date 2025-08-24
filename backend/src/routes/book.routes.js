// src/routes/book.routes.js
import express from "express";
import { BookController } from "../controllers/book.controller.js";

const router = express.Router();

// Lấy tất cả sách
router.get("/", BookController.getAllBooks);

// Lấy tất cả Category
router.get("/categories", BookController.getAllCategories);

// Lấy Book theo ISBN
router.get("/isbn/:isbn", BookController.getBookByISBN);

// Lấy Book theo Category
router.get("/category/:category", BookController.getBooksByCategory);

// Lấy Book theo Author
router.get("/author", BookController.getBooksByAuthor);

// Lấy Book theo ID (đặt cuối cùng vì :bookId có thể match tất cả)
router.get("/:bookId", BookController.getById);

router.post("/", BookController.create);
router.put("/:bookId", BookController.update);
router.delete("/:bookId", BookController.remove);

export default router;
