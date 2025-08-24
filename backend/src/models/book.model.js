// src/models/book.model.js
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const collectionName = "books";

export const BookModel = {
    async create(bookData) {
        const db = getDB();
        const result = await db.collection(collectionName).insertOne({
            ...bookData,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        return result;
    },

    async update(bookId, updateData) {
        const db = getDB();
        const result = await db.collection(collectionName).updateOne(
            { bookId },
            { $set: { ...updateData, updatedAt: new Date() } }
        );
        return result;
    },

    async delete(bookId) {
        const db = getDB();
        const result = await db.collection(collectionName).deleteOne({ bookId });
        return result;
    },

    async getAllBooks() {
        const db = await getDB();
        return await db.collection(collectionName).aggregate([
            { $match: { available: { $gt: 0 } } }, // lọc avalb khác 0
            { $project: { _id: 0, bookId: 1, title: 1, author: 1, isbn: 1, category: 1, year: 1, available: 1 } },
            { $sort: { title: 1 } } // sắp xếp A-Z
        ]).toArray();
    },

    async findByBookId(bookId) {
        const db = await getDB();
        const result = await db.collection(collectionName).aggregate([
            { $match: { bookId: bookId } },
            { $project: { _id: 0, isbn: 0, createdAt: 0, updatedAt: 0 } }
        ]).toArray();
        return result[0]; // vì bookId chỉ có 1 cuốn
    },

    async findByISBN(isbn) {
        const db = await getDB();
        const result = await db.collection(collectionName).aggregate([
            { $match: { isbn: isbn } },
            { $project: { _id: 0, isbn: 0, createdAt: 0, updatedAt: 0 } }
        ]).toArray();
        return result[0]; // vì ISBN chỉ có 1 cuốn
    },

    async findByCategory(category) {
        const db = await getDB();
        return await db.collection(collectionName).aggregate([
            { $match: { category: category } },
            // { $project: { _id: 0, title: 1, author: 1, category: 1, year: 1 } },
            { $sort: { year: -1 } } // sắp xếp theo năm giảm dần
        ]).toArray();
    },

    async findByAuthor(author) {
        const db = await getDB();
        return await db.collection(collectionName).aggregate([
            { $match: { author: { $regex: author, $options: "i" } } }, // "i" = ignore case
            { $sort: { year: -1 } }
        ]).toArray();
    },

    async getAllCategories() {
        const db = getDB(); // hàm này phải return ra client.db("library")
        const result = await db.collection(collectionName).distinct("category");
        return result;
    }

};
