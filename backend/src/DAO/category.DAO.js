// src/DAO/category.DAO.js
import { getDB } from "../config/db.js";

const COLLECTION = "categories";

// Helper: escape regex an toàn
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Helper: phát sinh ID CAT000001
async function nextCategoryId(db) {
  const ret = await db.collection("counters").findOneAndUpdate(
    { _id: "categoryId" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const n = ret.value?.seq || 1;
  return `CAT${String(n).padStart(6, "0")}`;
}

function normStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export const CategoryDAO = {
  /**
   * List + tìm kiếm + phân trang (phục vụ dropdown & trang quản trị)
   * query: { q, limit, page, ids }
   * Trả: { items, total, page, pageSize }
   */
  async list({ q = "", limit = 10, page = 1, ids = [], sort = "createdAt", order = "desc" } = {}) {
    const db = await getDB();
    const col = db.collection(COLLECTION);

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const match = {};
    const qq = (q || "").trim();
    if (qq) {
      const safe = escapeRegex(qq);
      match.$or = [
        { name: { $regex: safe, $options: "i" } },
        { categoryId: { $regex: safe, $options: "i" } },
      ];
    }

    const allowed = new Set(["name", "categoryId", "createdAt", "updatedAt"]);
    const field = allowed.has(String(sort)) ? String(sort) : "createdAt";
    const dir = String(order).toLowerCase() === "asc" ? 1 : -1;

    const total = await col.countDocuments(match);

    const pipeline = [
      { $match: match },
      { $sort: { [field]: dir, _id: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },

      // Đếm sách theo categoryId
      {
        $lookup: {
          from: "books",
          let: { cid: "$categoryId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$categoryId", "$$cid"] } } },
            { $count: "count" }
          ],
          as: "_b"
        }
      },
      { $addFields: { bookCount: { $ifNull: [{ $first: "$_b.count" }, 0] } } },
      { $project: { _id: 0, _b: 0 } }
    ];

    const items = await col.aggregate(pipeline).toArray();
    return { items, total, page, pageSize: limit };
  },

  /** Lấy 1 category theo categoryId */
  async getById(categoryId) {
    const db = await getDB();
    return db.collection(COLLECTION).findOne(
      { categoryId },
      { projection: { _id: 0 } }
    );
  },

  /** Tạo mới category, có thể auto-gen categoryId */
  async create(data = {}) {
    const db = await getDB();
    const col = db.collection(COLLECTION);

    const doc = {
      categoryId: normStr(data.categoryId) || (await nextCategoryId(db)),
      name: normStr(data.name),
      description: normStr(data.description),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!doc.name) throw new Error("NAME_REQUIRED");

    // Check trùng categoryId nếu client đưa lên
    if (data.categoryId) {
      const dup = await col.findOne({ categoryId: doc.categoryId }, { projection: { _id: 1 } });
      if (dup) throw new Error("CATEGORYID_TAKEN");
    }

    await col.insertOne(doc);
    return doc; // { categoryId, name, ... }
  },

  /** Cập nhật category theo categoryId */
  async update(categoryId, data = {}) {
    const db = await getDB();
    const col = db.collection(COLLECTION);

    const setDoc = {
      updatedAt: new Date(),
    };
    if (data.name !== undefined) setDoc.name = normStr(data.name);
    if (data.description !== undefined) setDoc.description = normStr(data.description);

    const r = await col.updateOne({ categoryId }, { $set: setDoc });
    return r;
  },

  /**
   * Xoá category (nếu đang được book tham chiếu → báo 409 phía controller)
   * Trả về kết quả deleteOne
   */
  async remove(categoryId) {
    const db = await getDB();
    // Kiểm tra đang được dùng bởi books?
    const inUse = await db.collection("books").countDocuments({ categoryId });
    if (inUse > 0) {
      const err = new Error("CATEGORY_IN_USE");
      err.code = "IN_USE";
      throw err;
    }
    return db.collection(COLLECTION).deleteOne({ categoryId });
  },

  /** Top category theo số lượng sách */
  async popular(limit = 5) {
    const db = await getDB();
    return db
      .collection("books")
      .aggregate([
        { $group: { _id: "$categoryId", bookCount: { $sum: 1 } } },
        { $sort: { bookCount: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "categoryId",
            as: "cat",
          },
        },
        { $unwind: "$cat" },
        {
          $project: {
            _id: 0,
            categoryId: "$cat.categoryId",
            name: "$cat.name",
            bookCount: 1,
          },
        },
      ])
      .toArray();
  },
};
