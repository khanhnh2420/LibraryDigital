// src/infra/ensureIndexes.js
import { getDB } from "../config/db.js";

/**
 * Idempotent: gọi lại nhiều lần cũng an toàn.
 * YÊU CẦU: connectDB() đã chạy trước đó.
 */
export async function ensureIndexes() {
  const db = getDB();

  // ===== LOANS =====
  // Truy vấn + sort
  await db.collection("loans").createIndex({ createdAt: -1 });
  await db.collection("loans").createIndex({ status: 1 });
  await db.collection("loans").createIndex({ userId: 1 });
  await db.collection("loans").createIndex({ bookId: 1 });
  await db.collection("loans").createIndex({ dueDate: 1 });
  await db.collection("loans").createIndex({ batchId: 1 });

  // Ngăn 1 user mượn trùng 1 sách khi còn active (ChoNhan|DangMuon|QuaHan)
  await db.collection("loans").createIndex(
    { userId: 1, bookId: 1, status: 1 },
    {
      unique: true,
      partialFilterExpression: { status: { $in: ["ChoNhan", "DangMuon", "QuaHan"] } }
    }
  );

  // ===== LOAN BATCHES =====
  await db.collection("loanBatches").createIndex({ userId: 1, status: 1 });
  await db.collection("loanBatches").createIndex({ expiresAt: 1, status: 1 }); // phục vụ auto-expire job
  // Hash của QR & short code: nên unique + sparse (nếu không set hash cũng không sao)
  await db.collection("loanBatches").createIndex({ qrTokenHash: 1 }, { unique: true, sparse: true });
  await db.collection("loanBatches").createIndex({ shortCodeHash: 1 }, { unique: true, sparse: true });

  // ===== USERS =====
  await db.collection("users").createIndex({ userId: 1 }, { unique: true });
  // Nếu có đăng nhập bằng username/email, có thể mở hai dòng sau:
  await db.collection("users").createIndex({ username: 1 }, { unique: true, sparse: true });
  // await db.collection("users").createIndex({ email: 1 }, { unique: true, sparse: true });

  // ===== BOOKS =====
  await db.collection("books").createIndex({ bookId: 1 }, { unique: true });

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


  // ===== AUTHORS / PUBLISHERS / CATEGORIES =====
  await db.collection("authors").createIndex({ authorId: 1 }, { unique: true });
  await db.collection("publishers").createIndex({ publisherId: 1 }, { unique: true });
  await db.collection("categories").createIndex({ categoryId: 1 }, { unique: true });

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
