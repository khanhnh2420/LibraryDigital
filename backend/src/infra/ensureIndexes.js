// src/infra/ensureIndexes.js
import { getDB } from "../config/db.js";

/**
 * Idempotent: có thể gọi lại nhiều lần
 * YÊU CẦU: connectDB() đã chạy trước đó.
 */
export async function ensureIndexes() {
  const db = getDB();

  // // LOANS
  // await db.collection("loans").createIndex({ batchId: 1, status: 1 }, { name: "loans_batch_status" });
  // await db.collection("loans").createIndex({ userId: 1, createdAt: -1 }, { name: "loans_user_createdAt" });
  // await db.collection("loans").createIndex({ bookId: 1, status: 1 }, { name: "loans_book_status" });

  // // LOAN BATCHES
  // await db.collection("loanBatches").createIndex({ status: 1, expiresAt: 1 }, { name: "batches_status_expiresAt" });
  // await db.collection("loanBatches").createIndex({ userId: 1, createdAt: -1 }, { name: "batches_user_createdAt" });


  // ===== USERS =====
  await db.collection("users").createIndex({ userId: 1 }, { unique: true });
  await db.collection("users").createIndex({ username: 1 }, { unique: true, sparse: true });
  await db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true });
  await db.collection("users").createIndex({ role: 1 }, {});
  await db.collection("users").createIndex({ status: 1 }, {});
  await db.collection("users").createIndex({ lastLogin: -1 }, {});
  await db.collection("users").createIndex(
    { username: 1 },
    { name: "uniq_username", unique: true, partialFilterExpression: { username: { $type: "string" } } }
  );
  await db.collection("users").createIndex(
    { email: 1 },
    { name: "uniq_email", unique: true, partialFilterExpression: { email: { $type: "string" } } }
  );
  // ===== BOOKS =====
  await db.collection("books").createIndex({ bookId: 1 }, { unique: true });
  await db.collection("books").createIndex({ available: -1 }, { name: "available_-1" });

  // Text search: KHÔNG dùng field `language` làm override
  await db.collection("books").createIndex(
    { title: "text", description: "text" },
    {
      name: "BooksTextIndex",
      weights: { title: 10, description: 3 },
      default_language: "none",
      language_override: "x_lang"
    }
  );

  await db.collection("books").createIndex({ categoryId: 1 });
  await db.collection("books").createIndex({ authorId: 1 });
  await db.collection("books").createIndex({ publisherId: 1 });
  await db.collection("books").createIndex({ available: -1 });
  await db.collection("books").createIndex({ isbn: 1 });


  // ===== AUTHORS  =====
  await db.collection("authors").createIndex({ authorId: 1 }, { unique: true, });
  await db.collection("authors").createIndex({ name: 1 },);
  await db.collection("books").createIndex({ authorId: 1 },);

  // ===== PUBLISHERS / CATEGORIES =====
  await db.collection("publishers").createIndex({ publisherId: 1 }, { unique: true });
  await db.collection("publishers").createIndex({ name: 1 });
  await db.collection("categories").createIndex({ categoryId: 1 }, { unique: true });
  await db.collection("categories").createIndex({ name: 1 });

  // ===== COMMENTS =====
  await db.collection("comments").createIndex({ bookId: 1, createdAt: -1 });
  await db.collection("comments").createIndex({ userId: 1, createdAt: -1 });

  // ===== IDEMPOTENCY (nếu dùng header Idempotency-Key khi tạo batch) =====
  // Tự xoá sau 1 ngày để DB gọn: cần field createdAt là Date.
  await db.collection("idempotency").createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: 24 * 60 * 60 }
  );
  await db.collection("idempotency").createIndex({ key: 1 }, { unique: true });

  console.log("✅ Mongo indexes ensured");
}
