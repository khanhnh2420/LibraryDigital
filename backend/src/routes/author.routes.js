// // src/routes/author.routes.js
// import express from "express";
// import { AuthorController } from "../controllers/author.controller.js";

// const router = express.Router();

// // Lấy tất cả authors
// router.get("/", AuthorController.getAllAuthors);

// // Lấy author theo ID
// router.get("/:authorId", AuthorController.getAuthorById);

// // Lấy sách theo author
// router.get("/:authorId/books", AuthorController.getBooksByAuthor);

// // Tìm kiếm authors
// router.get("/search/:searchTerm", AuthorController.searchAuthors);

// // Tạo author mới
// router.post("/", AuthorController.create);

// // Cập nhật author
// router.put("/:authorId", AuthorController.update);

// // Xóa author
// router.delete("/:authorId", AuthorController.remove);

// export default router;