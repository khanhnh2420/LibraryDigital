// src/DAO/category.DAO.js
import { getDB } from "../config/db.js";

const collection = "categories";

async function nextCategoryId(db) {
  const ret = await db.collection("counters").findOneAndUpdate(
    { _id: "categoryId" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const n = ret.value?.seq ?? 1;
  return `CAT${String(n).padStart(3, "0")}`;
}

const toStr = (v) => (v == null ? null : String(v).trim());

export const CategoryDAO = {
  /**
   * Lấy tất cả categories (đơn giản)
   */
  async getAllCategories() {
    const db = await getDB();
    return db
      .collection(collection)
      .find({})
      .project({ _id: 0, createdAt: 0, updatedAt: 0 })
      .sort({ categoryId: 1 })
      .toArray();
  },

  /**
   * Danh sách cho dropdown hoặc liệt kê nhẹ (có phân trang đơn giản)
   * Trả: { items, total, page, pageSize }
   */
  async list({ q = "", limit = 50, page = 1, ids = [] } = {}) {
    const db = await getDB();
    const col = db.collection(collection);

    const _page = Math.max(1, parseInt(page, 10) || 1);
    const _limit = Math.max(1, parseInt(limit, 10) || 50);

    const keyword = toStr(q) || "";
    const match = {};

    if (keyword) {
      // ưu tiên regex nhẹ — nếu muốn tối ưu hơn có thể dùng $text (đã tạo index text)
      match.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { categoryId: { $regex: keyword, $options: "i" } }
      ];
    }
    if (Array.isArray(ids) && ids.length > 0) {
      match.categoryId = { $in: ids };
    }

    const total = await col.countDocuments(match);
    const items = await col
      .find(match, { projection: { _id: 0, categoryId: 1, name: 1 } })
      .sort({ name: 1, categoryId: 1 })
      .skip((_page - 1) * _limit)
      .limit(_limit)
      .toArray();

    return { items, total, page: _page, pageSize: _limit };
  },

  // ========== CRUD OPERATIONS ==========
  async getCategoryById(categoryId) {
    const db = await getDB();
    return db
      .collection(collection)
      .findOne({ categoryId }, { projection: { _id: 0 } });
  },

  async createCategory(categoryData) {
    const db = await getDB();
    const col = db.collection(collection);

    // validate cơ bản
    const { isValid, errors } = this.validateCategoryData(categoryData);
    if (!isValid) {
      const err = new Error("VALIDATION_ERROR:: " + errors.join(", "));
      err.code = "VALIDATION_ERROR";
      throw err;
    }

    const doc = {
      categoryId: toStr(categoryData.categoryId) || (await nextCategoryId(db)),
      name: String(categoryData.name).trim(),
      description: toStr(categoryData.description),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await col.insertOne(doc);
    return doc;
  },

  async updateCategory(categoryId, updateData) {
    const db = await getDB();

    const set = {};
    if ("name" in updateData) set.name = toStr(updateData.name);
    if ("description" in updateData) set.description = toStr(updateData.description);
    set.updatedAt = new Date();

    const r = await db.collection(collection).updateOne(
      { categoryId },
      { $set: set }
    );
    return r;
  },

  async deleteCategory(categoryId) {
    const db = await getDB();

    // Chặn xoá nếu còn sách tham chiếu
    const bookCount = await db.collection("books").countDocuments({ categoryId });
    if (bookCount > 0) {
      const err = new Error("CATEGORY_IN_USE");
      err.code = "CATEGORY_IN_USE";
      err.bookCount = bookCount;
      throw err;
    }

    const r = await db.collection(collection).deleteOne({ categoryId });
    return r;
  },

  // ========== SPECIAL QUERIES ==========
  async categoryExists(categoryId) {
    const db = await getDB();
    const count = await db.collection(collection).countDocuments({ categoryId });
    return count > 0;
  },

  /**
   * Danh sách phân trang đầy đủ (kèm bookCount)
   * Trả: { categories, pagination: { page, limit, total, totalPages } }
   */
  async getCategoriesPaginated(page = 1, limit = 10) {
    const db = await getDB();
    const _page = Math.max(1, parseInt(page, 10) || 1);
    const _limit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (_page - 1) * _limit;

    const [categories, total] = await Promise.all([
      db
        .collection(collection)
        .aggregate([
          { $sort: { name: 1, categoryId: 1 } },
          {
            $lookup: {
              from: "books",
              let: { cid: "$categoryId" },
              pipeline: [
                { $match: { $expr: { $eq: ["$categoryId", "$$cid"] } } },
                { $count: "c" }
              ],
              as: "countBooks"
            }
          },
          {
            $addFields: {
              bookCount: { $ifNull: [{ $arrayElemAt: ["$countBooks.c", 0] }, 0] }
            }
          },
          { $project: { _id: 0, countBooks: 0 } },
          { $skip: skip },
          { $limit: _limit }
        ])
        .toArray(),
      db.collection(collection).countDocuments()
    ]);

    return {
      categories,
      pagination: {
        page: _page,
        limit: _limit,
        total,
        totalPages: Math.ceil(total / _limit)
      }
    };
  },

  async searchCategories(searchTerm) {
    const db = await getDB();
    const q = String(searchTerm || "").trim();
    return db
      .collection(collection)
      .find(
        q
          ? { name: { $regex: q, $options: "i" } }
          : {},
        { projection: { _id: 0, createdAt: 0, updatedAt: 0 } }
      )
      .sort({ categoryId: 1 })
      .toArray();
  },

  async getPopularCategories(limit = 5) {
    const db = await getDB();
    return db
      .collection("books")
      .aggregate([
        { $group: { _id: "$categoryId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: Math.max(1, parseInt(limit, 10) || 5) },
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

  // ========== VALIDATION ==========
  validateCategoryData(categoryData = {}) {
    const errors = [];
    const name = toStr(categoryData.name);

    if (!name) errors.push("Tên category là bắt buộc");
    if (name && name.length > 100) errors.push("Tên category không được vượt quá 100 ký tự");

    // categoryId KHÔNG bắt buộc (sẽ tự sinh nếu thiếu)
    return { isValid: errors.length === 0, errors };
  }
};
