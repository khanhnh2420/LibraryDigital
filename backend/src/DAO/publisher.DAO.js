import { getDB } from "../config/db.js";

const collection = "publishers";

export const PublisherDAO = {
  async list({ q = "", limit = 50, page = 1, ids = [] } = {}) {
    const db = await getDB();
    const col = db.collection(collection);

    const match = {};
    if (q?.trim()) {
      match.$or = [
        { name: { $regex: q.trim(), $options: "i" } },
        { publisherId: { $regex: q.trim(), $options: "i" } }
      ];
    }
    if (Array.isArray(ids) && ids.length > 0) {
      match.publisherId = { $in: ids };
    }

    const total = await col.countDocuments(match);
    const items = await col.find(match, { projection: { _id: 0, publisherId: 1, name: 1 } })
      .sort({ name: 1, publisherId: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return { items, total, page, pageSize: limit };
  }
};
