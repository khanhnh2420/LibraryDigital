// src/models/book.model.js
import { getDB } from "../config/db.js";

const collectionName = "books";

// Định nghĩa pipeline dùng chung
const bookAggregation = [
    {
        $lookup: {
            from: "authors",
            localField: "authorId",
            foreignField: "authorId",
            as: "author"
        }
    },
    {
        $lookup: {
            from: "publishers",
            localField: "publisherId",
            foreignField: "publisherId",
            as: "publisher"
        }
    },
    {
        $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "categoryId",
            as: "category"
        }
    },
    { $unwind: "$author" },
    { $unwind: "$publisher" },
    { $unwind: "$category" },
    {
        $project: {
            _id: 0,
            bookId: 1,
            title: 1,
            isbn: 1,
            year: 1,
            language: 1,
            available: 1,
            location: 1,
            coverImage: 1,
            description: 1,
            "author.name": 1,
            "author.authorId": 1,
            "publisher.name": 1,
            "publisher.publisherId": 1,
            "category.name": 1,
            "category.categoryId": 1
        }
    }
];


export const BookModel = {

    // ========== BASIC CRUD ==========
    async getAllBooks() {
        const db = await getDB();
        return await db.collection(collectionName)
            .project({ _id: 0 })
            .sort({ bookId: 1 })
            .toArray();
    },

    async getRandomBooks(limit = 100) {
        const db = await getDB();
        return await db.collection(collectionName)
            .aggregate([
                { $sample: { size: limit } },   // Lấy ngẫu nhiên 'limit' bản ghi
                ...bookAggregation
            ])
            .toArray();
    },

    async getBookById(bookId) {
        const db = await getDB();
        return await db.collection(collectionName)
            .findOne({ bookId }, { projection: { _id: 0 } });
    },

    async getBookByISBN(isbn) {
        const db = await getDB();
        const result = await db.collection(collectionName)
            .aggregate([
                { $match: { isbn } },  // Lọc theo ISBN
                ...bookAggregation
            ])
            .toArray();

        return result[0] || null;  // Trả về 1 document hoặc null
    },

    async createBook(bookData) {
        const db = await getDB();
        const newBook = {
            ...bookData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await db.collection(collectionName).insertOne(newBook);
        return newBook;
    },

    async updateBook(bookId, updateData) {
        const db = await getDB();
        const result = await db.collection(collectionName)
            .updateOne(
                { bookId },
                { $set: { ...updateData, updatedAt: new Date() } }
            );
        return result;
    },

    async deleteBook(bookId) {
        const db = await getDB();
        const result = await db.collection(collectionName)
            .deleteOne({ bookId });
        return result;
    },

    // ========== QUERY METHODS ==========
    async getBooksByCategory(categoryId) {
        const db = await getDB();
        return await db.collection(collectionName)
            .find({ categoryId })
            .project({ _id: 0 })
            .toArray();
    },

    async getBooksByAuthor(authorId) {
        const db = await getDB();
        return await db.collection(collectionName)
            .find({ authorId })
            .project({ _id: 0 })
            .toArray();
    },

    async searchBooks(searchTerm) {
        const db = await getDB();
        return await db.collection(collectionName)
            .aggregate([
                {
                    $match: {
                        $or: [
                            { title: { $regex: searchTerm, $options: 'i' } },
                            { description: { $regex: searchTerm, $options: 'i' } }
                        ]
                    }
                },
                ...bookAggregation
            ])
            .toArray();
    },

    async getAvailableBooks() {
        const db = await getDB();
        return await db.collection(collectionName)
            .find({ available: { $gt: 0 } })
            .project({ _id: 0 })
            .toArray();
    },

    // ========== AGGREGATION METHODS ==========
    async getBooksWithDetails() {
        const db = await getDB();
        return await db.collection(collectionName)
            .aggregate([
                ...bookAggregation,
                {
                    $sort: { bookId: 1 }
                }
            ])
            .toArray();
    },

    // ========== UTILITY METHODS ==========
    async bookExists(bookId) {
        const db = await getDB();
        const count = await db.collection(collectionName)
            .countDocuments({ bookId });
        return count > 0;
    },

    validateBookData(bookData) {
        const errors = [];

        if (!bookData.bookId) errors.push("bookId là bắt buộc");
        if (!bookData.title) errors.push("title là bắt buộc");
        if (!bookData.authorId) errors.push("authorId là bắt buộc");
        if (!bookData.publisherId) errors.push("publisherId là bắt buộc");
        if (!bookData.categoryId) errors.push("categoryId là bắt buộc");

        return {
            isValid: errors.length === 0,
            errors
        };
    }

};