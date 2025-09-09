// src/DAO/category.DAO.js
import { getDB } from "../config/db.js";
import { customAlphabet } from "nanoid";

const COLLECTION = "categories";

// ===== NanoID generator (CAT + [0-9A-Z]) =====
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);
function newCategoryId() {
  return "CAT" + nanoid(); // ví dụ: CAT9ZQ1P7K3A
}

// Helper: escape regex an toàn
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export const CategoryDAO = {
  /**
   * List + tìm kiếm + phân trang (phục vụ dropdown & trang quản trị)
   * query: { q, limit, page, ids, sort, order }
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
    // (tùy chọn) lọc theo danh sách ids nếu truyền vào
    if (Array.isArray(ids) && ids.length > 0) {
      match.categoryId = { $in: ids.map(String) };
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

  /** Tạo mới category: nếu không truyền categoryId -> auto-gen bằng NanoID */
  async create(data = {}) {
    const db = await getDB();
    const col = db.collection(COLLECTION);

    const name = normStr(data.name);
    if (!name) throw new Error("NAME_REQUIRED");

    const baseDoc = {
      name,
      description: normStr(data.description),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Nếu client gửi categoryId thủ công -> tôn trọng nhưng kiểm tra trùng
    const clientId = normStr(data.categoryId);
    if (clientId) {
      const dup = await col.findOne({ categoryId: clientId }, { projection: { _id: 1 } });
      if (dup) throw new Error("CATEGORYID_TAKEN");

      const doc = { categoryId: clientId, ...baseDoc };
      await col.insertOne(doc);
      return doc;
    }

    // Tự sinh categoryId ngẫu nhiên + retry nếu hiếm hoi trùng (unique index)
    for (let i = 0; i < 5; i++) {
      const categoryId = newCategoryId();
      const doc = { categoryId, ...baseDoc };

      try {
        await col.insertOne(doc);
        return doc;
      } catch (e) {
        if (e?.code === 11000) continue; // trùng key -> thử lại
        throw e;
      }
    }
    throw new Error("ID_GEN_FAILED:: could not generate unique categoryId after retries");
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
