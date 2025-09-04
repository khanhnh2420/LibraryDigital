// src/models/book.DAO.js
import { getDB } from "../config/db.js";

const collectionName = "books";

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

// ===== Helpers =====
async function nextBookId(db) {
  const ret = await db.collection("counters").findOneAndUpdate(
    { _id: "bookId" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  const n = ret.value?.seq || 1;
  return `BK${String(n).padStart(6, "0")}`;
}

// Đồng bộ counters.seq >= max số đang có trong books (BKxxxxxx)
async function ensureCounterAtLeastMax(db) {
  const r = await db.collection(collectionName).aggregate([
    { $match: { bookId: { $regex: /^BK\d+$/ } } },
    {
      $project: {
        n: {
          $toInt: {
            $regexFind: { input: "$bookId", regex: /\d+$/ }
          }.match
        }
      }
    },
    { $group: { _id: null, maxNum: { $max: "$n" } } }
  ]).toArray();

  const maxNum = (r[0] && r[0].maxNum) || 0;

  await db.collection("counters").updateOne(
    { _id: "bookId" },
    { $max: { seq: maxNum } }, // chỉ nâng lên nếu đang thấp hơn
    { upsert: true }
  );
}

// Sinh bookId duy nhất, có retry & fallback sync counters
async function generateUniqueBookId(db, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const id = await nextBookId(db);
    const exists = await db.collection(collectionName).findOne(
      { bookId: id },
      { projection: { _id: 1 } }
    );
    if (!exists) return id;
  }
  // fallback: sync counters rồi cấp lại một lần
  await ensureCounterAtLeastMax(db);
  return await nextBookId(db);
}

function toStr(v) {
  return v == null ? null : String(v).trim();
}
function toNum(v) {
  return v == null ? null : Number(v);
}
function normalizeNumber(n) {
  return n == null ? null : Number(n);
}

export const BookModel = {
  // ===== Paged list (for GET /api/books) =====
  async listBooksPaged(qs = {}) {
    const db = await getDB();
    const col = db.collection(collectionName);

    // parse query
    const page = Math.max(1, parseInt(qs.page || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(qs.pageSize || "12", 10)));
    const q = (qs.q || "").trim();
    const categoryId = (qs.categoryId || "").trim() || null;

    const allowedSorts = new Set(["title", "year", "available", "createdAt"]);
    const sortField = allowedSorts.has(String(qs.sort)) ? String(qs.sort) : "createdAt";
    const sortOrder = String(qs.order || "desc").toLowerCase() === "asc" ? 1 : -1;

    // match
    const match = {};
    let useText = false;

    if (categoryId) match.categoryId = categoryId;

    if (q) {
      const qRaw = String(q).trim();

      const mId = /^id\s*:\s*(\S+)$/i.exec(qRaw);    // cho phép "id: BK000123"
      const mIsbn = /^isbn\s*:\s*(.+)$/i.exec(qRaw);   // cho phép "isbn: 123-456"
      const looksLikeBookId = /^BK\d{3,}$/i.test(qRaw);
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
        ...bookAggregation
      ])
      .toArray();
  },

  async getBookById(bookId) {
    const db = await getDB();
    const docs = await db.collection(collectionName)
      .aggregate([
        { $match: { bookId } },
        ...bookAggregation,
      ])
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

    // KHÔNG nhận bookId từ client để tránh trùng (có thể bật lại nếu cần, nhưng phải check trùng trước)
    let bookId = await generateUniqueBookId(db);

    const authorOk = await db.collection("authors").findOne({ authorId: toStr(bookData.authorId) });
    const publisherOk = await db.collection("publishers").findOne({ publisherId: toStr(bookData.publisherId) });
    const categoryOk = await db.collection("categories").findOne({ categoryId: toStr(bookData.categoryId) });

    if (!authorOk || !publisherOk || !categoryOk) {
      throw new Error("VALIDATION_ERROR:: authorId/publisherId/categoryId không tồn tại");
    }

    const loc = toStr(bookData.location) || "Chưa sắp xếp";

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
      // Nếu vừa khởi động counters thấp hơn & gây trùng -> sync rồi thử lại 1 lần
      if (e?.code === 11000 && e?.keyPattern?.bookId) {
        await ensureCounterAtLeastMax(db);
        bookId = await generateUniqueBookId(db);
        doc.bookId = bookId;
        await col.insertOne(doc);
        return doc;
      }
      throw e;
    }
  },

  async updateBook(bookId, updateData) {
    const db = await getDB();
    const payload = { ...updateData };

    if ("year" in payload) payload.year = normalizeNumber(payload.year);
    if ("quantity" in payload && payload.quantity != null) payload.quantity = Number(payload.quantity);
    if ("available" in payload && payload.available != null) payload.available = Number(payload.available);

    // đảm bảo available không vượt quantity nếu cả 2 cùng có
    if (typeof payload.quantity === "number" && typeof payload.available === "number") {
      if (payload.available > payload.quantity) payload.available = payload.quantity;
      if (payload.available < 0) payload.available = 0;
    }

    const result = await db
      .collection(collectionName)
      .updateOne({ bookId }, { $set: { ...payload, updatedAt: new Date() } });

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
