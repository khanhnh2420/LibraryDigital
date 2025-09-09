// src/app.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();

import { connectDB } from "./config/db.js";
import { ensureIndexes } from "./infra/ensureIndexes.js";
import { expireHolds } from "./jobs/expireHolds.job.js";

// Routes common/mobile
import authRoutes from "./routes/auth.routes.js";
import bookRoutes from "./routes/book.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import profileRoutes from "./routes/profile.routes.js";

// Routes Admin
import dashboardRoutes from "./routes/dashboard.routes.js";
// import loansRoutes from "./routes/loans.routes.js";
// import batchesRoutes from "./routes/batches.routes.js";
import authorRoutes from "./routes/author.routes.js";
import publisherRoutes from "./routes/publisher.routes.js";
import userAdminRoutes from "./routes/user.admin.routes.js";

import uploadRoutes from "./routes/upload.routes.js";

// Middlewares
import { authenticateJWT, authorizeRoles } from "./middlewares/auth.middleware.js";
import { globalLimiter } from "./middlewares/rateLimit.js";

/**
 * ENV gợi ý (Render → Environment):
 * CORS_ORIGIN = https://librarydigital.netlify.app,https://*.netlify.app,http://localhost:5173
 */

// 1) Kết nối DB
await connectDB();

// 2) Ensure indexes
try {
  await ensureIndexes();
} catch (err) {
  console.error("❌ Ensure indexes failed:", err);
}

// expireHolds();

// ===== App =====
const app = express();

/* ========================= CORS (TRƯỚC TẤT CẢ) ========================= */
const RAW_ORIGINS =
  process.env.CORS_ORIGIN ||
  "http://localhost:5173,https://librarydigital.netlify.app,https://*.netlify.app";

// Chuyển danh sách origin/wildcard thành regex patterns
const ORIGIN_PATTERNS = RAW_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((pat) => {
    const rx =
      "^" +
      pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&") // escape regex special chars
         .replace(/\*/g, ".*") +               // '*' -> '.*'
      "$";
    return new RegExp(rx);
  });

function isAllowedOrigin(origin) {
  if (!origin) return true; // curl/Postman/mobile
  try {
    const url = new URL(origin);
    const full = origin;       // scheme + host
    const host = url.hostname; // chỉ host
    // 1) Match exact/wildcard từ env
    if (ORIGIN_PATTERNS.some((rx) => rx.test(full))) return true;
    // 2) Cho mọi deploy preview Netlify (*.netlify.app)
    if (/\.netlify\.app$/.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, cb) {
    const ok = isAllowedOrigin(origin);
    cb(ok ? null : new Error(`CORS blocked for origin: ${origin}`), ok);
  },
  credentials: true, // cần nếu FE dùng cookie (refreshToken)
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

// CORS phải đứng TRƯỚC mọi middleware/routes khác
app.use(cors(corsOptions));
// Bật preflight toàn cục
app.options("*", cors(corsOptions));

// Cho preflight đi qua trước rate-limit/auth...
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
/* ====================================================================== */

// ===== Middlewares khác =====
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(globalLimiter);

// ===== Public / Mobile APIs =====
app.use("/api/auth", authRoutes);        // /login, /staff/login, /register, /refresh, /logout
app.use("/api/books", bookRoutes);       // GET list/detail ...
app.use("/api/categories", categoryRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", profileRoutes);    // /me, /profile,...

// Upload
app.use("/api/upload", uploadRoutes);

// ===== Admin APIs (bắt buộc token + role) =====
app.use(
  "/api/dashboard",
  authenticateJWT,
  authorizeRoles("admin", "librarian"),
  dashboardRoutes
);

// app.use("/api/loans", loansRoutes);

// app.use(
//   "/api/loanBatches",
//   authenticateJWT,
//   authorizeRoles("admin", "librarian"),
//   batchesRoutes
// );

app.use(
  "/api/authors",
  authenticateJWT,
  authorizeRoles("admin", "librarian"),
  authorRoutes
);

app.use(
  "/api/publishers",
  authenticateJWT,
  authorizeRoles("admin", "librarian"),
  publisherRoutes
);

// Quản trị người dùng chỉ dành cho admin/librarian
app.use(
  "/api/admin/users",
  authenticateJWT,
  authorizeRoles("admin", "librarian"),
  userAdminRoutes
);

// ===== Demo =====
app.get("/api/admin/data", authenticateJWT, authorizeRoles("admin"), (_req, res) => {
  res.json({ message: "Chỉ admin mới xem được dữ liệu này" });
});

app.get("/api/profile", authenticateJWT, (req, res) => {
  res.json({ message: "Chỉ user đã đăng nhập mới thấy", user: req.user });
});

// ===== Healthcheck =====
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Library API is running",
    timestamp: new Date().toISOString(),
  });
});

// ===== 404 =====
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: `Route ${req.originalUrl} does not exist`,
  });
});

// ===== Error =====
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  // Có thể phân biệt lỗi CORS để trả 403 thay vì 500
  if (String(err?.message || "").toLowerCase().includes("cors")) {
    return res.status(403).json({ error: "CORS", message: err.message });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
