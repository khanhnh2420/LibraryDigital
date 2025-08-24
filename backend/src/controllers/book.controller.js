// src/controllers/book.controller.js
import { BookModel } from "../models/book.model.js";

export const BookController = {

    async getAllCategories(req, res) {
        console.log("test")
        try {
            const books = await BookModel.getAllCategories();
            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi getAll Books:", err);
            return res.status(500).json({ err });
        }
    },

    // Lấy tất cả sách
    getAllBooks: async (req, res) => {
        try {
            const books = await BookModel.getAllBooks(); // gọi đúng hàm trong model
            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi getAllBooks:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Lấy 1 sách theo bookId
    async getById(req, res) {
        try {
            const { bookId } = req.params;
            const book = await BookModel.findById(bookId);
            if (!book) {
                return res.status(404).json({ message: "Không tìm thấy sách" });
            }
            return res.status(200).json(book);
        } catch (err) {
            console.error("❌ Lỗi getById Book:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Thêm mới sách
    async create(req, res) {
        try {
            const bookData = req.body;
            const result = await BookModel.create(bookData);
            return res.status(201).json({ message: "Thêm sách thành công", bookId: result.insertedId });
        } catch (err) {
            console.error("❌ Lỗi create Book:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Cập nhật sách
    async update(req, res) {
        try {
            const { bookId } = req.params;
            const updateData = req.body;
            const result = await BookModel.update(bookId, updateData);
            if (result.matchedCount === 0) {
                return res.status(404).json({ message: "Không tìm thấy sách để cập nhật" });
            }
            return res.status(200).json({ message: "Cập nhật sách thành công" });
        } catch (err) {
            console.error("❌ Lỗi update Book:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Xóa sách
    async remove(req, res) {
        try {
            const { bookId } = req.params;
            const result = await BookModel.delete(bookId);
            if (result.deletedCount === 0) {
                return res.status(404).json({ message: "Không tìm thấy sách để xóa" });
            }
            return res.status(200).json({ message: "Xóa sách thành công" });
        } catch (err) {
            console.error("❌ Lỗi delete Book:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // GET /api/books/isbn/:isbn
    getBookByBookId: async (req, res) => {
        try {
            const { bookId } = req.params;
            const book = await BookModel.findByBookId(bookId);

            if (!book) {
                return res.status(404).json({ message: "Không tìm thấy sách với bookId này" });
            }

            return res.status(200).json(book);
        } catch (err) {
            console.error("❌ Lỗi getBookByBookId:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // GET /api/books/isbn/:isbn
    getBookByISBN: async (req, res) => {
        try {
            const { isbn } = req.params;
            const book = await BookModel.findByISBN(isbn);

            if (!book) {
                return res.status(404).json({ message: "Không tìm thấy sách với ISBN này" });
            }

            return res.status(200).json(book);
        } catch (err) {
            console.error("❌ Lỗi getBookByISBN:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // GET /api/books/category/:category
    getBooksByCategory: async (req, res) => {
        try {
            const { category } = req.params;
            const books = await BookModel.findByCategory(category);

            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi getBooksByCategory:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // GET /api/books/author/:author
    getBooksByAuthor: async (req, res) => {
        try {
            const { author } = req.query;

            if (!author) {
                return res.status(400).json({ message: "Thiếu tên tác giả" });
            }

            const books = await BookModel.findByAuthor(author);

            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi getBooksByAuthor:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    }

};
