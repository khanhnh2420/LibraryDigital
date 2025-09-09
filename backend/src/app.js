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

// ===== Middlewares =====
const ALLOW_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map(s => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      // Cho phép origin null (Postman, curl) hoặc nằm trong whitelist
      if (!origin || ALLOW_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true, // cần cho cookie refresh token
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(globalLimiter);


// ===== Public / Mobile APIs =====
app.use("/api/auth", authRoutes);        // /login, /staff/login, /register, /refresh, /logout
app.use("/api/books", bookRoutes);       // GET list/detail (nếu có POST/PUT/DELETE thì chặn tại router)
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

// app.use(
//   "/api/loans",
//   loansRoutes
// );

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

// Quản trị người dùng chỉ dành cho admin
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
  res.status(500).json({ error: "Internal Server Error" });
});

export default app;
