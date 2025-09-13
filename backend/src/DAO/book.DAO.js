// src/DAO/book.DAO.js
import { getDB } from "../config/db.js";
import { customAlphabet } from "nanoid";

const collectionName = "books";

// ===== NanoID generator (BK + [0-9A-Z]) =====
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 10);
function newBookId() {
  return "BK" + nanoid(); // ví dụ: BK2Q9M7A3X1
}

// ===== Common aggregation (join) =====
const bookAggregation = [
  {
    $lookup: {
      from: "authors",
      localField: "authorId",
      foreignField: "authorId",
      as: "author"
    }
  },
  {
    $lookup: {
      from: "publishers",
      localField: "publisherId",
      foreignField: "publisherId",
      as: "publisher"
    }
  },
  {
    $lookup: {
      from: "categories",
      localField: "categoryId",
      foreignField: "categoryId",
      as: "category"
    }
  },
  { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
  { $unwind: { path: "$publisher", preserveNullAndEmptyArrays: true } },
  { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
  {
    $project: {
      _id: 0,
      bookId: 1,
      title: 1,
      isbn: 1,
      year: 1,
      language: 1,
      available: 1,
      quantity: 1,
      location: 1,
      coverImage: 1,
      description: 1,
      authorId: 1,
      publisherId: 1,
      categoryId: 1,
      "author.name": 1,
      "author.authorId": 1,
      "publisher.name": 1,
      "publisher.publisherId": 1,
      "category.name": 1,
      "category.categoryId": 1,
      createdAt: 1,
      updatedAt: 1
    }
  }
];

// ===== Small helpers =====
function toStr(v) {
  return v == null ? null : String(v).trim();
}
function toNum(v) {
  return v == null ? null : Number(v);
}
function normalizeNumber(n) {
  return n == null ? null : Number(n);
}

// Nhận param có thể là string/array/comma-separated -> trả về mảng id sạch
function normalizeIdParam(p) {
  if (p == null) return null;
  if (Array.isArray(p)) return p.map((s) => String(s).trim()).filter(Boolean);
  const s = String(p).trim();
  if (!s) return null;
  if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
  return [s];
}

// Parse year: ưu tiên year (exact), nếu không có thì dùng yearMin/yearMax (range)
function parseYearParams(qs) {
  const exact = Number(qs.year);
  if (Number.isFinite(exact)) return { exact };

  const min = Number(qs.yearMin);
  const max = Number(qs.yearMax);
  const range = {};
  if (Number.isFinite(min)) range.$gte = min;
  if (Number.isFinite(max)) range.$lte = max;

  return Object.keys(range).length ? { range } : {};
}

// ===== Comment stats (ratingAvg, ratingCount, likesCount) từ collection "comments" =====
function makeCommentStatsStages() {
  return [
    {
      $lookup: {
        from: "comments",
        let: { bookId: "$bookId" },
        pipeline: [
          // match theo bookId; nếu bạn có cờ xóa mềm thì thêm { $ne: [ "$deleted", true ] }
          { $match: { $expr: { $eq: ["$bookId", "$$bookId"] } } },

          // Lấy những gì cần để tính
          { $project: { rating: 1, likes: 1 } },

          // Chuẩn hóa likesN: nếu likes là mảng -> size; nếu là số -> chính nó; null -> 0
          {
            $addFields: {
              likesN: {
                $cond: [
                  { $isArray: "$likes" },
                  { $size: "$likes" },
                  { $ifNull: ["$likes", 0] }
                ]
              }
            }
          },

          // Gom thành tổng/đếm/like
          {
            $group: {
              _id: null,
              ratingSum: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$rating", null] },
                        { $gte: ["$rating", 1] }
                      ]
                    },
                    "$rating",
                    0
                  ]
                }
              },
              ratingCount: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $ne: ["$rating", null] },
                        { $gte: ["$rating", 1] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              likesCount: { $sum: "$likesN" }
            }
          },

          // Tính trung bình; nếu không có lượt nào thì 0
          {
            $project: {
              _id: 0,
              ratingCount: 1,
              likesCount: 1,
              ratingAvg: {
                $cond: [
                  { $gt: ["$ratingCount", 0] },
                  { $divide: ["$ratingSum", "$ratingCount"] },
                  0
                ]
              }
            }
          }
        ],
        as: "stats"
      }
    },
    {
      // Gỡ giá trị từ mảng stats[0] -> field phẳng
      $addFields: {
        ratingAvg: { $ifNull: [{ $arrayElemAt: ["$stats.ratingAvg", 0] }, 0] },
        ratingCount: { $ifNull: [{ $arrayElemAt: ["$stats.ratingCount", 0] }, 0] },
        likesCount: { $ifNull: [{ $arrayElemAt: ["$stats.likesCount", 0] }, 0] },
        // alias tùy UI đang dùng:
        reviewsCount: { $ifNull: [{ $arrayElemAt: ["$stats.ratingCount", 0] }, 0] }
      }
    },
    { $project: { stats: 0 } }
  ];
}

export const BookDAO = {
  // ===== Paged list (for GET /api/books) =====
  async listBooksPaged(qs = {}) {
    const db = await getDB();
    const col = db.collection(collectionName);

    // parse query cơ bản
    const page = Math.max(1, parseInt(qs.page || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(qs.pageSize || "12", 10)));
    const q = (qs.q || "").trim();

    // các filter
    const categoryIds = normalizeIdParam(qs.categoryId);
    const authorIds = normalizeIdParam(qs.authorId);
    const publisherIds = normalizeIdParam(qs.publisherId);
    const { exact: yearExact, range: yearRange } = parseYearParams(qs);

    const allowedSorts = new Set(["title", "year", "available", "createdAt"]);
    const sortField = allowedSorts.has(String(qs.sort)) ? String(qs.sort) : "createdAt";
    const sortOrder = String(qs.order || "desc").toLowerCase() === "asc" ? 1 : -1;

    // match
    const match = {};
    let useText = false;

    if (categoryIds?.length) {
      match.categoryId = categoryIds.length === 1 ? categoryIds[0] : { $in: categoryIds };
    }
    if (authorIds?.length) {
      match.authorId = authorIds.length === 1 ? authorIds[0] : { $in: authorIds };
    }
    if (publisherIds?.length) {
      match.publisherId = publisherIds.length === 1 ? publisherIds[0] : { $in: publisherIds };
    }
    if (yearExact != null) {
      match.year = yearExact;
    } else if (yearRange) {
      match.year = yearRange; // { $gte, $lte } tùy tham số
    }

    if (q) {
      const qRaw = String(q).trim();

      const mId = /^id\s*:\s*(\S+)$/i.exec(qRaw);      // "id: BKxxxxx"
      const mIsbn = /^isbn\s*:\s*(.+)$/i.exec(qRaw);   // "isbn: 123-456"
      const looksLikeBookId = /^BK(?:\d{3,}|[0-9A-Z]{8,})$/i.test(qRaw);
      const looksLikeIsbn = /^[0-9Xx\s-]{5,}$/.test(qRaw);

      if (mId || looksLikeBookId) {
        const id = (mId ? mId[1] : qRaw).toUpperCase();
        match.bookId = id;
      } else if (mIsbn || looksLikeIsbn) {
        const isbn = (mIsbn ? mIsbn[1] : qRaw).trim();
        match.isbn = isbn;
      } else {
        match.$text = { $search: qRaw };
        useText = true;
      }
    }

    // total
    const total = await col.countDocuments(match);

    // pipeline
    const pipeline = [{ $match: match }];

    if (useText) {
      pipeline.push({ $addFields: { score: { $meta: "textScore" } } });
      pipeline.push({ $sort: { score: { $meta: "textScore" }, _id: -1 } });
    } else {
      pipeline.push({ $sort: { [sortField]: sortOrder, _id: -1 } });
    }

    pipeline.push(
      ...bookAggregation,
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize }
    );

    const items = await col.aggregate(pipeline).toArray();

    return { items, total, page, pageSize };
  },


  // ===== Existing methods =====
  async getAllBooks() {
    const db = await getDB();
    return await db
      .collection(collectionName)
      .find({}, { projection: { _id: 0 } })
      .sort({ bookId: 1 })
      .toArray();
  },

  async get100Books(limit = 100) {
    const db = await getDB();
    return await db
      .collection(collectionName)
      .aggregate([
        { $sort: { _id: -1 } },
        { $group: { _id: "$bookId", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
        { $limit: limit },
        ...bookAggregation
      ])
      .toArray();
  },

  async get500Books(limit = 500) {
    const db = await getDB();
    return await db
      .collection(collectionName)
      .aggregate([
        { $sort: { _id: -1 } },
        { $group: { _id: "$bookId", doc: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$doc" } },
        { $limit: limit },
        ...bookAggregation,
        ...makeCommentStatsStages(),
      ])
      .toArray();
  },

  async getBookById(bookId) {
    const db = await getDB();
    const docs = await db.collection(collectionName)
      .aggregate([{ $match: { bookId } }, ...bookAggregation])
      .toArray();
    return docs[0] || null;
  },

  async getBookByISBN(isbn) {
    const db = await getDB();
    const result = await db
      .collection(collectionName)
      .aggregate([{ $match: { isbn } }, ...bookAggregation])
      .toArray();
    return result[0] || null;
  },

  // ===== BASIC CRUD =====
  async createBook(bookData) {
    const db = await getDB();
    const col = db.collection(collectionName);

    // validate
    const { isValid, errors } = this.validateBookData(bookData);
    if (!isValid) {
      throw new Error("VALIDATION_ERROR:: " + errors.join(", "));
    }

    const now = new Date();

    const quantity = bookData.quantity != null ? Number(bookData.quantity) : 1;
    let available = bookData.available != null ? Number(bookData.available) : quantity;

    const safeQty = Number.isFinite(quantity) && quantity >= 0 ? quantity : 1;
    let safeAvail = Number.isFinite(available) && available >= 0 ? available : safeQty;
    if (safeAvail > safeQty) safeAvail = safeQty;

    // Xác thực FK mềm (khuyến nghị bật để dữ liệu sạch)
    const authorOk = await db.collection("authors").findOne({ authorId: toStr(bookData.authorId) });
    const publisherOk = await db.collection("publishers").findOne({ publisherId: toStr(bookData.publisherId) });
    const categoryOk = await db.collection("categories").findOne({ categoryId: toStr(bookData.categoryId) });
    if (!authorOk || !publisherOk || !categoryOk) {
      throw new Error("VALIDATION_ERROR:: authorId/publisherId/categoryId không tồn tại");
    }

    const loc = toStr(bookData.location) || "Chưa sắp xếp";

    // Sinh ID ngẫu nhiên + retry nếu hiếm hoi trùng (unique index)
    for (let i = 0; i < 5; i++) {
      const bookId = newBookId();
      const doc = {
        bookId,
        title: String(bookData.title).trim(),
        year: toNum(bookData.year),
        language: toStr(bookData.language),
        isbn: toStr(bookData.isbn),

        quantity: safeQty,
        available: safeAvail,

        location: loc,
        coverImage: toStr(bookData.coverImage),
        description:
          bookData.description && String(bookData.description).trim().length > 0
            ? String(bookData.description).trim()
            : "Không có mô tả",

        authorId: toStr(bookData.authorId),
        publisherId: toStr(bookData.publisherId),
        categoryId: toStr(bookData.categoryId),

        createdAt: bookData.createdAt ? new Date(bookData.createdAt) : now,
        updatedAt: now
      };

      try {
        await col.insertOne(doc);
        return doc;
      } catch (e) {
        if (e?.code === 11000 && e?.keyPattern?.bookId) {
          // trùng ID -> thử lại
          continue;
        }
        throw e;
      }
    }
    throw new Error("ID_GEN_FAILED:: could not generate unique bookId after retries");
  },

  async updateBook(bookId, updateData) {
    const db = await getDB();
    const payload = { ...updateData };

    if ("year" in payload) payload.year = normalizeNumber(payload.year);
    if ("quantity" in payload && payload.quantity != null) payload.quantity = Number(payload.quantity);
    if ("available" in payload && payload.available != null) payload.available = Number(payload.available);

    const now = new Date();

    // Nếu chỉ đổi quantity, clamp available hiện tại xuống nếu cần
    if (typeof payload.quantity === "number" && !("available" in payload)) {
      const cur = await db.collection(collectionName).findOne(
        { bookId },
        { projection: { available: 1 } }
      );
      if (cur && typeof cur.available === "number" && cur.available > payload.quantity) {
        payload.available = payload.quantity;
      }
    }

    // Nếu có cả 2: clamp như cũ
    if (typeof payload.quantity === "number" && typeof payload.available === "number") {
      if (payload.available > payload.quantity) payload.available = payload.quantity;
      if (payload.available < 0) payload.available = 0;
    }

    // Nếu đổi authorId/publisherId/categoryId: xác thực tồn tại
    for (const [coll, key] of [["authors", "authorId"], ["publishers", "publisherId"], ["categories", "categoryId"]]) {
      if (key in payload && payload[key] != null) {
        const ok = await db.collection(coll).findOne({ [key]: toStr(payload[key]) });
        if (!ok) throw new Error(`VALIDATION_ERROR:: ${key} không tồn tại`);
        payload[key] = toStr(payload[key]);
      }
    }

    const result = await db
      .collection(collectionName)
      .updateOne({ bookId }, { $set: { ...payload, updatedAt: now } });

    return result;
  },

  async deleteBook(bookId) {
    const db = await getDB();
    const result = await db.collection(collectionName).deleteOne({ bookId });
    return result;
  },

  // ===== QUERY METHODS =====
  async getBooksByCategory(categoryId) {
    const db = await getDB();
    return await db
      .collection(collectionName)
      .find({ categoryId }, { projection: { _id: 0 } })
      .toArray();
  },

  async getBooksByAuthor(authorId) {
    const db = await getDB();
    return await db
      .collection(collectionName)
      .find({ authorId }, { projection: { _id: 0 } })
      .toArray();
  },

  async searchBooks(searchTerm) {
    const db = await getDB();
    // Ưu tiên $text nếu có index, fallback regex nếu cần
    const useText = true;
    if (useText) {
      return await db
        .collection(collectionName)
        .find(
          { $text: { $search: searchTerm } },
          { projection: { _id: 0, score: { $meta: "textScore" } } }
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(50)
        .toArray();
    } else {
      return await db
        .collection(collectionName)
        .aggregate([
          {
            $match: {
              $or: [
                { title: { $regex: searchTerm, $options: "i" } },
                { description: { $regex: searchTerm, $options: "i" } }
              ]
            }
          },
          ...bookAggregation
        ])
        .toArray();
    }
  },

  async getAvailableBooks() {
    const db = await getDB();
    return await db
      .collection(collectionName)
      .find({ available: { $gt: 0 } }, { projection: { _id: 0 } })
      .toArray();
  },

  // ===== AGGREGATION METHODS =====
  async getBooksWithDetails() {
    const db = await getDB();
    return await db
      .collection(collectionName)
      .aggregate([...bookAggregation, { $sort: { bookId: 1 } }])
      .toArray();
  },

  // ===== UTIL =====
  async bookExists(bookId) {
    const db = await getDB();
    const count = await db.collection(collectionName).countDocuments({ bookId });
    return count > 0;
  },

  async decAvailableIfPossible(bookId, session) {
    const db = await getDB();
    const res = await db.collection(collectionName).findOneAndUpdate(
      { bookId, available: { $gte: 1 } },
      { $inc: { available: -1 } },
      { session, returnDocument: "after" }
    );
    return !!res.value; // true nếu trừ thành công
  },

  async incAvailable(bookId, session) {
    const db = await getDB();
    // Không tăng vượt quantity
    const res = await db.collection(collectionName).findOneAndUpdate(
      { bookId, $expr: { $lt: ["$available", "$quantity"] } },
      { $inc: { available: 1 } },
      { session, returnDocument: "after" }
    );
    return !!res.value;
  },

  validateBookData(bookData) {
    const errors = [];

    if (!bookData?.title || String(bookData.title).trim().length === 0) {
      errors.push("title là bắt buộc");
    }
    if (bookData.year != null && Number.isNaN(Number(bookData.year))) {
      errors.push("year phải là số");
    }
    if (!bookData?.authorId?.trim()) errors.push("authorId là bắt buộc");
    if (!bookData?.publisherId?.trim()) errors.push("publisherId là bắt buộc");
    if (!bookData?.categoryId?.trim()) errors.push("categoryId là bắt buộc");
    if (bookData.quantity != null) {
      const q = Number(bookData.quantity);
      if (Number.isNaN(q) || q < 0) errors.push("quantity phải là số >= 0");
    }
    if (bookData.available != null) {
      const a = Number(bookData.available);
      if (Number.isNaN(a) || a < 0) errors.push("available phải là số >= 0");
    }

    return { isValid: errors.length === 0, errors };
  }
};
