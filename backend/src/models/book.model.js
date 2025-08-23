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

    async findAll() {
        const db = getDB();
        return await db.collection(collectionName).find().toArray();
    },

    async findById(bookId) {
        const db = getDB();
        return await db.collection(collectionName).findOne({ bookId });
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

    async findByISBN(isbn) {
        const db = await getDB();
        const result = await db.collection(collectionName).aggregate([
            { $match: { isbn: isbn } },
            { $project: { _id: 0, title: 1, author: 1, isbn: 1, category: 1, year: 1 } }
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
            { $match: { author: author } },
            // { $project: { _id: 0, title: 1, author: 1, category: 1, year: 1 } },
            { $sort: { year: -1 } } // sắp xếp theo năm giảm dần
        ]).toArray();
    },

    async getAllBooks() {
        const db = await getDB();
        return await db.collection(collectionName).aggregate([
            { $project: { _id: 0, title: 1, author: 1, isbn: 1, category: 1, year: 1 } },
            { $sort: { title: 1 } } // sắp xếp A-Z
        ]).toArray();
    },


    async getAllCategories() {
        const db = getDB(); // hàm này phải return ra client.db("library")
        const result = await db.collection(collectionName).distinct("category");
        return result;
    }

};
