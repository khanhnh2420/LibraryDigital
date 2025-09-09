// src/DAO/author.DAO.js
import { getDB } from "../config/db.js";
import { escapeRegex } from "../utils/regex.js";
import { customAlphabet } from "nanoid";

const COLLECTION = "authors";
const toStr = (v) => (v == null ? null : String(v).trim());
const toBool = (v) => (v === false ? false : true);

// ===== NanoID generator (AUTH + [0-9A-Z]) =====
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);
function newAuthorId() {
  return "AUTH" + nanoid(); // ví dụ: AUTH9ZQ1P7K3A
}

export const AuthorDAO = {
  /**
   * Dành cho dropdown/list nhanh
   * Hỗ trợ q/ids/sort/order, mặc định sort theo name asc
   */
  async list({ q = "", limit = 200, page = 1, ids = [], sort = "name", order = "asc" } = {}) {
    const db = await getDB();
    const col = db.collection(COLLECTION);

    const pageN = Math.max(1, parseInt(page, 10) || 1);
    const limitN = Math.min(200, Math.max(1, parseInt(limit, 10) || 200));

    const match = {};
    const qq = toStr(q) || "";
    if (Array.isArray(ids) && ids.length > 0) {
      match.authorId = { $in: ids.map((x) => String(x)) };
    } else if (qq) {
      const safe = escapeRegex(qq);
      match.$or = [
        { name: { $regex: safe, $options: "i" } },
        { authorId: { $regex: safe, $options: "i" } },
      ];
    }

    const allowedSort = new Set(["name", "authorId", "createdAt", "updatedAt"]);
    const field = allowedSort.has(String(sort)) ? String(sort) : "name";
    const dir = String(order).toLowerCase() === "desc" ? -1 : 1;

    const total = await col.countDocuments(match);
    const items = await col
      .find(match, {
        projection: {
          _id: 0,
          authorId: 1,
          name: 1,
          description: 1,
          website: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      })
      .sort({ [field]: dir, _id: -1 })
      .skip((pageN - 1) * limitN)
      .limit(limitN)
      .toArray();

    return { items, total, page: pageN, pageSize: limitN };
  },

  /**
   * Danh sách trang quản trị (kèm bookCount)
   * Mặc định sort createdAt desc (mới nhất)
   */
  async listPaged({ page = 1, pageSize = 10, q = "", sort = "createdAt", order = "desc" } = {}) {
    const db = await getDB();
    const col = db.collection(COLLECTION);

    const _page = Math.max(1, parseInt(page, 10) || 1);
    const _limit = Math.max(1, parseInt(pageSize, 10) || 10);
    const keyword = toStr(q) || "";

    const match = {};
    if (keyword) {
      const safe = escapeRegex(keyword);
      match.$or = [
        { name: { $regex: safe, $options: "i" } },
        { authorId: { $regex: safe, $options: "i" } },
      ];
    }

    const allowedSort = new Set(["name", "authorId", "createdAt", "updatedAt", "bookCount"]);
    const field = allowedSort.has(String(sort)) ? String(sort) : "createdAt";
    const dir = String(order).toLowerCase() === "asc" ? 1 : -1;

    const total = await col.countDocuments(match);

    // sort thường
    if (field !== "bookCount") {
      const items = await col
        .aggregate([
          { $match: match },
          { $sort: { [field]: dir, _id: -1 } },
          { $skip: (_page - 1) * _limit },
          { $limit: _limit },
          {
            $lookup: {
              from: "books",
              let: { aid: "$authorId" },
              pipeline: [
                { $match: { $expr: { $eq: ["$authorId", "$$aid"] } } },
                { $count: "c" },
              ],
              as: "_b",
            },
          },
          { $addFields: { bookCount: { $ifNull: [{ $first: "$_b.c" }, 0] } } },
          { $project: { _id: 0, _b: 0 } },
        ])
        .toArray();

      return { items, total, page: _page, pageSize: _limit };
    }

    // sort theo bookCount
    const items = await col
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: "books",
            let: { aid: "$authorId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$authorId", "$$aid"] } } },
              { $count: "c" },
            ],
            as: "_b",
          },
        },
        { $addFields: { bookCount: { $ifNull: [{ $first: "$_b.c" }, 0] } } },
        { $project: { _id: 0, _b: 0 } },
        { $sort: { bookCount: dir, _id: -1 } },
        { $skip: (_page - 1) * _limit },
        { $limit: _limit },
      ])
      .toArray();

    return { items, total, page: _page, pageSize: _limit };
  },

  async getById(authorId) {
    const db = await getDB();
    return db.collection(COLLECTION).findOne(
      { authorId },
      { projection: { _id: 0 } }
    );
  },

  async create(data) {
    const db = await getDB();
    const col = db.collection(COLLECTION);

    const name = toStr(data.name);
    if (!name) {
      const err = new Error("VALIDATION_ERROR:: Tên tác giả là bắt buộc");
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    if (name.length > 120) {
      const err = new Error("VALIDATION_ERROR:: Tên tác giả không vượt quá 120 ký tự");
      err.code = "VALIDATION_ERROR";
      throw err;
    }

    // Nếu client gửi authorId -> dùng, ngược lại tự sinh NanoID
    const authorId = toStr(data.authorId) || newAuthorId();

    // check trùng theo authorId hoặc name
    const dup = await col.findOne({ $or: [{ authorId }, { name }] }, { projection: { _id: 1 } });
    if (dup) {
      const err = new Error("AUTHOR_DUPLICATED");
      err.code = "AUTHOR_DUPLICATED";
      throw err;
    }

    const now = new Date();
    const doc = {
      authorId,
      name,
      description: toStr(data.description) || "Không có mô tả",
      website: toStr(data.website),
      createdAt: now,
      updatedAt: now,
      isActive: toBool(data.isActive),
    };

    await col.insertOne(doc);
    return doc;
  },

  async update(authorId, payload) {
    const db = await getDB();
    const set = {};
    if ("name" in payload) set.name = toStr(payload.name);
    if ("description" in payload) set.description = toStr(payload.description);
    if ("website" in payload) set.website = toStr(payload.website);
    if ("isActive" in payload) set.isActive = toBool(payload.isActive);
    set.updatedAt = new Date();

    return db.collection(COLLECTION).updateOne({ authorId }, { $set: set });
  },

  async remove(authorId) {
    const db = await getDB();
    // Không xoá nếu còn sách tham chiếu
    const count = await db.collection("books").countDocuments({ authorId });
    if (count > 0) {
      const err = new Error("AUTHOR_IN_USE");
      err.code = "AUTHOR_IN_USE";
      err.bookCount = count;
      throw err;
    }
    return db.collection(COLLECTION).deleteOne({ authorId });
  },
};
