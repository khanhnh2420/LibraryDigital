// src/models/category.model.js
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const collectionName = "categories";

export const CategoryModel = {
    
    // ========== CRUD OPERATIONS ==========
    
    /**
     * Lấy tất cả categories
     */
    async getAllCategories() {
        const db = await getDB();
        return await db.collection(collectionName)
            .find({})
            .project({ _id: 0, createdAt: 0, updatedAt: 0 })
            .sort({ categoryId: 1 })
            .toArray();
    },

    /**
     * Lấy category by ID
     */
    async getCategoryById(categoryId) {
        const db = await getDB();
        return await db.collection(collectionName)
            .findOne({ categoryId }, { projection: { _id: 0 } });
    },

    /**
     * Tạo category mới
     */
    async createCategory(categoryData) {
        const db = await getDB();
        const newCategory = {
            ...categoryData,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const result = await db.collection(collectionName).insertOne(newCategory);
        return { ...newCategory, _id: result.insertedId };
    },

    /**
     * Cập nhật category
     */
    async updateCategory(categoryId, updateData) {
        const db = await getDB();
        const result = await db.collection(collectionName)
            .updateOne(
                { categoryId },
                { 
                    $set: { 
                        ...updateData, 
                        updatedAt: new Date() 
                    } 
                }
            );
        return result;
    },

    /**
     * Xóa category
     */
    async deleteCategory(categoryId) {
        const db = await getDB();
        const result = await db.collection(collectionName)
            .deleteOne({ categoryId });
        return result;
    },

    // ========== SPECIAL QUERIES ==========
    
    /**
     * Kiểm tra category có tồn tại không
     */
    async categoryExists(categoryId) {
        const db = await getDB();
        const count = await db.collection(collectionName)
            .countDocuments({ categoryId });
        return count > 0;
    },

    /**
     * Lấy categories với phân trang
     */
    async getCategoriesPaginated(page = 1, limit = 10) {
        const db = await getDB();
        const skip = (page - 1) * limit;
        
        const [categories, total] = await Promise.all([
            db.collection(collectionName)
                .find({})
                .project({ _id: 0, createdAt: 0, updatedAt: 0 })
                .sort({ categoryId: 1 })
                .skip(skip)
                .limit(limit)
                .toArray(),
            db.collection(collectionName).countDocuments()
        ]);

        return {
            categories,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Tìm kiếm categories theo tên
     */
    async searchCategories(searchTerm) {
        const db = await getDB();
        return await db.collection(collectionName)
            .find({ 
                name: { $regex: searchTerm, $options: 'i' } 
            })
            .project({ _id: 0, createdAt: 0, updatedAt: 0 })
            .sort({ categoryId: 1 })
            .toArray();
    },

    /**
     * Lấy categories có nhiều sách nhất (popular categories)
     */
    async getPopularCategories(limit = 5) {
        const db = await getDB();
        // Giả sử có collection books với trường categoryId
        return await db.collection('books')
            .aggregate([
                { $group: { _id: "$categoryId", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: limit },
                {
                    $lookup: {
                        from: "categories",
                        localField: "_id",
                        foreignField: "categoryId",
                        as: "categoryInfo"
                    }
                },
                { $unwind: "$categoryInfo" },
                {
                    $project: {
                        _id: 0,
                        categoryId: "$categoryInfo.categoryId",
                        name: "$categoryInfo.name",
                        bookCount: "$count"
                    }
                }
            ])
            .toArray();
    },

    // ========== VALIDATION METHODS ==========
    
    /**
     * Validate category data trước khi create/update
     */
    validateCategoryData(categoryData) {
        const errors = [];
        
        if (!categoryData.categoryId) {
            errors.push("categoryId là bắt buộc");
        }
        
        if (!categoryData.name || categoryData.name.trim().length === 0) {
            errors.push("Tên category là bắt buộc");
        }
        
        if (categoryData.name && categoryData.name.length > 100) {
            errors.push("Tên category không được vượt quá 100 ký tự");
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

};