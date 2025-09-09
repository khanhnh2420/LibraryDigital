// src/DAO/publisher.DAO.js
import { getDB } from "../config/db.js";

const collection = "publishers";
const toStr = (v) => (v == null ? null : String(v).trim());

async function nextPublisherId(db) {
  const ret = await db.collection("counters").findOneAndUpdate(
    { _id: "publisherId" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const n = ret.value?.seq ?? 1;
  return `PUB${String(n).padStart(6, "0")}`;
}

export const PublisherDAO = {
  // Dropdown / list nhẹ — MẶC ĐỊNH: mới nhất
async list({ q = "", limit = 200, page = 1, ids = [], sort = "createdAt", order = "desc" } = {}) {
  const db = await getDB();
  const col = db.collection(collection);

  const pageN  = Math.max(1, parseInt(page, 10) || 1);
  const limitN = Math.min(200, Math.max(1, parseInt(limit, 10) || 200));
  const keyword = toStr(q) || "";

  const match = {};
  if (Array.isArray(ids) && ids.length > 0) {
    match.publisherId = { $in: ids.map(String) };
  } else if (keyword) {
    match.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { publisherId: { $regex: keyword, $options: "i" } },
    ];
  }

  const allowedSort = new Set(["name", "publisherId", "createdAt", "updatedAt"]);
  const field = allowedSort.has(String(sort)) ? String(sort) : "createdAt";
  const dir   = String(order).toLowerCase() === "asc" ? 1 : -1;

  const total = await col.countDocuments(match);
  const items = await col
    .find(match, { projection: { _id: 0, publisherId: 1, name: 1, createdAt: 1, updatedAt: 1 } })
    .sort({ [field]: dir, _id: -1 })
    .skip((pageN - 1) * limitN)
    .limit(limitN)
    .toArray();

  return { items, total, page: pageN, pageSize: limitN };
},

// List phân trang cho admin + bookCount — MẶC ĐỊNH: mới nhất
async listPaged({ page = 1, pageSize = 10, q = "", sort = "createdAt", order = "desc" } = {}) {
  const db = await getDB();
  const col = db.collection(collection);

  const pageN  = Math.max(1, parseInt(page, 10) || 1);
  const limitN = Math.max(1, parseInt(pageSize, 10) || 10);
  const keyword = toStr(q) || "";

  const match = {};
  if (keyword) {
    match.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { publisherId: { $regex: keyword, $options: "i" } },
    ];
  }

  const allowedSort = new Set(["name", "publisherId", "createdAt", "updatedAt", "bookCount"]);
  const field = allowedSort.has(String(sort)) ? String(sort) : "createdAt";
  const dir   = String(order).toLowerCase() === "asc" ? 1 : -1;

  const total = await col.countDocuments(match);

  if (field !== "bookCount") {
    const items = await col.aggregate([
      { $match: match },
      { $sort: { [field]: dir, _id: -1 } },
      { $skip: (pageN - 1) * limitN },
      { $limit: limitN },
      {
        $lookup: {
          from: "books",
          let: { pid: "$publisherId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$publisherId", "$$pid"] } } },
            { $count: "c" }
          ],
          as: "_cnt"
        }
      },
      { $addFields: { bookCount: { $ifNull: [{ $first: "$_cnt.c" }, 0] } } },
      { $project: { _id: 0, _cnt: 0 } },
    ]).toArray();

    return { items, total, page: pageN, pageSize: limitN };
  }

  // sort theo bookCount
  const items = await col.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "books",
        let: { pid: "$publisherId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$publisherId", "$$pid"] } } },
          { $count: "c" }
        ],
        as: "_cnt"
      }
    },
    { $addFields: { bookCount: { $ifNull: [{ $first: "$_cnt.c" }, 0] } } },
    { $project: { _id: 0, _cnt: 0 } },
    { $sort: { bookCount: dir, _id: -1 } },
    { $skip: (pageN - 1) * limitN },
    { $limit: limitN },
  ]).toArray();

  return { items, total, page: pageN, pageSize: limitN };
},


  async getById(publisherId) {
    const db = await getDB();
    return db.collection(collection).findOne({ publisherId }, { projection: { _id: 0 } });
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
      publisherId: toStr(data.publisherId) || await nextPublisherId(db),
      name: String(data.name).trim(),
      website: toStr(data.website),
      email: toStr(data.email),
      phone: toStr(data.phone),
      address: toStr(data.address),
      country: toStr(data.country),
      notes: toStr(data.notes),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection(collection).insertOne(doc);
    return doc;
  },

  async update(publisherId, payload) {
    const db = await getDB();
    const set = {};
    for (const k of ["name", "description"]) {
      if (k in payload) set[k] = toStr(payload[k]);
    }
    set.updatedAt = new Date();

    return db.collection(collection).updateOne({ publisherId }, { $set: set });
  },

  async remove(publisherId) {
    const db = await getDB();
    const count = await db.collection("books").countDocuments({ publisherId });
    if (count > 0) {
      const err = new Error("PUBLISHER_IN_USE");
      err.code = "PUBLISHER_IN_USE";
      err.bookCount = count;
      throw err;
    }
    return db.collection(collection).deleteOne({ publisherId });
  },

  validate(data = {}) {
    const errors = [];
    const name = toStr(data.name);
    if (!name) errors.push("Tên NXB là bắt buộc");
    if (name && name.length > 150) errors.push("Tên NXB không vượt quá 150 ký tự");
    return { isValid: errors.length === 0, errors };
  },
};
