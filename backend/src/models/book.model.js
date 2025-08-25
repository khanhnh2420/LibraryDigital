// src/models/book.model.js
import { getDB } from "../config/db.js";

const collectionName = "books";

export const BookModel = {

    // ========== BASIC CRUD ==========
    async getAllBooks() {
        const db = await getDB();
        return await db.collection(collectionName)
            .find({})
            .project({ _id: 0 })
            .sort({ bookId: 1 })
            .toArray();
    },

    async getBookById(bookId) {
        const db = await getDB();
        return await db.collection(collectionName)
            .findOne({ bookId }, { projection: { _id: 0 } });
    },

    async getBookByISBN(isbn) {
        const db = await getDB();
        return await db.collection(collectionName)
            .findOne({ isbn }, { projection: { _id: 0 } });
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
            .find({
                $or: [
                    { title: { $regex: searchTerm, $options: 'i' } },
                    { description: { $regex: searchTerm, $options: 'i' } }
                ]
            })
            .project({ _id: 0 })
            .toArray();
    },

    async getAvailableBooks() {
        const db = await getDB();
        return await db.collection(collectionName)
            .find({ available: { $gt: 0 } })
            .project({ _id: 0 })
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