// src/DAO/author.DAO.js
import { getDB } from "../config/db.js";

const collection = "authors";
const toStr = (v) => (v == null ? null : String(v).trim());

export const AuthorDAO = {
  /**
   * Dùng cho dropdown / list
   * Hỗ trợ: q (search theo name/authorId), ids (lấy theo danh sách id),
   * page/limit (phân trang), sort mặc định theo name rồi authorId.
   */
  async list({ q = "", limit = 200, page = 1, ids = [] } = {}) {
    const db = await getDB();
    const col = db.collection(collection);

    const pageN = Math.max(1, parseInt(page, 10) || 1);
    const limitN = Math.min(200, Math.max(1, parseInt(limit, 10) || 200));
    const qTrim = toStr(q) || "";

    const match = {};

    if (Array.isArray(ids) && ids.length > 0) {
      match.authorId = { $in: ids.map((x) => String(x)) };
    } else if (qTrim) {
      match.$or = [
        { name: { $regex: qTrim, $options: "i" } },
        { authorId: { $regex: qTrim, $options: "i" } },
      ];
    }

    const total = await col.countDocuments(match);

    const items = await col
      .find(
        match,
        { projection: { _id: 0, authorId: 1, name: 1, bio: 1, website: 1 } }
      )
      .sort({ name: 1, authorId: 1 })
      .skip((pageN - 1) * limitN)
      .limit(limitN)
      .toArray();

    return { items, total, page: pageN, pageSize: limitN };
  },

  // Paged admin list + bookCount
  async listPaged({ page = 1, pageSize = 10, q = "" } = {}) {
    const db = await getDB();
    const col = db.collection(collection);

    const _page = Math.max(1, parseInt(page, 10) || 1);
    const _limit = Math.max(1, parseInt(pageSize, 10) || 10);
    const keyword = toStr(q) || "";
    const match = {};

    if (keyword) {
      match.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { authorId: { $regex: keyword, $options: "i" } }
      ];
    }

    const total = await col.countDocuments(match);
    const items = await col.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "books",
          let: { aid: "$authorId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$authorId", "$$aid"] } } },
            { $count: "c" }
          ],
          as: "countBooks"
        }
      },
      {
        $addFields: { bookCount: { $ifNull: [{ $arrayElemAt: ["$countBooks.c", 0] }, 0] } }
      },
      { $project: { _id: 0, countBooks: 0 } },
      { $sort: { name: 1, authorId: 1 } },
      { $skip: (_page - 1) * _limit },
      { $limit: _limit }
    ]).toArray();

    return { items, total, page: _page, pageSize: _limit };
  },

  async getById(authorId) {
    const db = await getDB();
    return db.collection(collection).findOne({ authorId }, { projection: { _id: 0 } });
  },

  async create(data) {
    const db = await getDB();

    const { isValid, errors } = this.validate(data);
    if (!isValid) {
      const err = new Error("VALIDATION_ERROR:: " + errors.join(", "));
      err.code = "VALIDATION_ERROR";
      throw err;
    }

    const doc = {
      authorId: toStr(data.authorId) || (await nextAuthorId(db)),
      name: String(data.name).trim(),
      bio: toStr(data.bio),
      website: toStr(data.website),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection(collection).insertOne(doc);
    return doc;
  },

  async update(authorId, payload) {
    const db = await getDB();
    const set = {};
    if ("name" in payload) set.name = toStr(payload.name);
    if ("bio" in payload) set.bio = toStr(payload.bio);
    if ("website" in payload) set.website = toStr(payload.website);
    set.updatedAt = new Date();

    return db.collection(collection).updateOne({ authorId }, { $set: set });
  },

  async remove(authorId) {
    const db = await getDB();
    const count = await db.collection("books").countDocuments({ authorId });
    if (count > 0) {
      const err = new Error("AUTHOR_IN_USE");
      err.code = "AUTHOR_IN_USE";
      err.bookCount = count;
      throw err;
    }
    return db.collection(collection).deleteOne({ authorId });
  },

  validate(data = {}) {
    const errors = [];
    const name = toStr(data.name);
    if (!name) errors.push("Tên tác giả là bắt buộc");
    if (name && name.length > 120) errors.push("Tên tác giả không vượt quá 120 ký tự");
    return { isValid: errors.length === 0, errors };
  }

};
