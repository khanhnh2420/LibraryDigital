// src/controllers/book.controller.js
import { BookModel } from "../DAO/book.DAO.js";
import { derivePublicIdFromUrl } from "../utils/cloudinaryTools.js";
import { deleteCloudinaryByPublicId } from "../utils/cloudinaryDelete.js";

export const BookController = {

    // GET /api/books?page=1&pageSize=12&q=python&categoryId=CAT001&sort=createdAt&order=desc
    listPaged: async (req, res) => {
        try {
            const result = await BookModel.listBooksPaged(req.query);
            return res.status(200).json(result); // { items, total, page, pageSize }
        } catch (err) {
            console.error("❌ Lỗi listPaged:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Lấy tất cả sách
    getAllBooks: async (req, res) => {
        try {
            const books = await BookModel.getAllBooks();
            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi getAllBooks:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Lấy 100 Book
    get100Books: async (req, res) => {
        try {
            const books = await BookModel.get100Books();
            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi getRandomBooks:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Lấy 500 Book
    get500Books: async (req, res) => {
        try {
            const books = await BookModel.get500Books();
            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi get500Books:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Lấy sách theo ID
    getBookById: async (req, res) => {
        try {
            const { bookId } = req.params;
            const book = await BookModel.getBookById(bookId);

            if (!book) {
                return res.status(404).json({ message: "Không tìm thấy sách" });
            }

            return res.status(200).json(book);
        } catch (err) {
            console.error("❌ Lỗi getBookById:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Lấy sách theo ISBN
    getBookByISBN: async (req, res) => {
        try {
            const { isbn } = req.params;
            const book = await BookModel.getBookByISBN(isbn);

            if (!book) {
                return res.status(404).json({ message: "Không tìm thấy sách với ISBN này" });
            }

            return res.status(200).json(book);
        } catch (err) {
            console.error("❌ Lỗi getBookByISBN:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Lấy sách theo category ID
    getBooksByCategory: async (req, res) => {
        try {
            const { categoryId } = req.params;
            const books = await BookModel.getBooksByCategory(categoryId);

            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi getBooksByCategory:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Lấy sách theo author ID
    getBooksByAuthor: async (req, res) => {
        try {
            const { authorId } = req.params;
            const books = await BookModel.getBooksByAuthor(authorId);

            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi getBooksByAuthor:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Tìm kiếm sách
    searchBooks: async (req, res) => {
        try {
            const { searchTerm } = req.params;
            const books = await BookModel.searchBooks(searchTerm);

            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi searchBooks:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Lấy sách available
    getAvailableBooks: async (req, res) => {
        try {
            const books = await BookModel.getAvailableBooks();

            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi getAvailableBooks:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Lấy sách với đầy đủ thông tin (có join)
    getBooksWithDetails: async (req, res) => {
        try {
            const books = await BookModel.getBooksWithDetails();

            return res.status(200).json(books);
        } catch (err) {
            console.error("❌ Lỗi getBooksWithDetails:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Thêm mới sách
    create: async (req, res) => {
        try {
            const bookData = req.body;

            // Validate dữ liệu
            const validation = BookModel.validateBookData(bookData);
            if (!validation.isValid) {
                return res.status(400).json({
                    message: "Dữ liệu không hợp lệ",
                    errors: validation.errors
                });
            }

            const result = await BookModel.createBook(bookData);

            return res.status(201).json({
                message: "Thêm sách thành công",
                bookId: result.bookId
            });
        } catch (err) {
            console.error("❌ Lỗi create Book:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Cập nhật sách
    update: async (req, res) => {
        try {
            const { bookId } = req.params;
            const updateData = req.body;

            const current = await BookModel.getBookById(bookId);
            if (!current) return res.status(404).json({ message: "Không tìm thấy sách" });

            // Nếu coverImage đổi sang URL khác → xóa ảnh cũ
            const oldUrl = current.coverImage;
            const newUrl = updateData.coverImage;

            const result = await BookModel.updateBook(bookId, updateData);

            // Xóa sau khi DB đã cập nhật thành công (tránh treo update)
            if (newUrl && oldUrl && oldUrl !== newUrl) {
                const publicId = derivePublicIdFromUrl(oldUrl);
                if (publicId) {
                    deleteCloudinaryByPublicId(publicId)
                        .catch((e) => console.error("Delete old cover failed:", e)); // log lỗi nhưng không phá response
                }
            }

            return res.json({ message: "Cập nhật sách thành công", modifiedCount: result.modifiedCount });
        } catch (err) {
            console.error("❌ Lỗi update Book:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },

    // Xóa sách
    remove: async (req, res) => {
        try {
            const { bookId } = req.params;
            const current = await BookModel.getBookById(bookId);
            if (!current) return res.status(404).json({ message: "Không tìm thấy sách" });

            const r = await BookModel.deleteBook(bookId);

            // Sau khi xóa DB → xóa ảnh trên cloud (best-effort)
            if (current.coverImage) {
                const publicId = derivePublicIdFromUrl(current.coverImage);
                if (publicId) {
                    deleteCloudinaryByPublicId(publicId)
                        .catch((e) => console.error("Delete cover after book deletion failed:", e));
                }
            }

            return res.json({ message: "Xóa sách thành công", deletedCount: r.deletedCount });
        } catch (err) {
            console.error("❌ Lỗi delete Book:", err);
            return res.status(500).json({ message: "Lỗi server" });
        }
    }
};