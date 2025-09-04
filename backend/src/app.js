// src/app.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
dotenv.config();

import { connectDB } from "./config/db.js";
import { ensureIndexes } from "./infra/ensureIndexes.js";

// Routes mobile
import authRoutes from "./routes/auth.routes.js";
import bookRoutes from "./routes/book.routes.js";
import authorRoutes from "./routes/author.routes.js";
import publisherRoutes from "./routes/publisher.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import userRoutes from "./routes/user.routes.js";

// Routes Web
import dashboardRoutes from "./routes/dashboard.routes.js";
import loansRoutes from "./routes/loans.routes.js";
import batchesRoutes from "./routes/batches.routes.js";

// Middleware
import { authenticateJWT, authorizeRoles } from "./middlewares/auth.middleware.js";

// 1) Kết nối DB trước
await connectDB();

// 2) Tạo index sau khi đã kết nối
try {
  await ensureIndexes();
  // console.log("✅ Indexes ensured");
} catch (err) {
  console.error("❌ Ensure indexes failed:", err);
  // Có thể process.exit(1) nếu muốn fail cứng
}

const app = express();

// Middleware cơ bản
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Routes mobile
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/users", userRoutes);

// Routes Web (Admin)
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/loans", loansRoutes);
app.use("/api/loanBatches", batchesRoutes);
app.use("/api/authors", authorRoutes);
app.use("/api/publishers", publisherRoutes);
app.use("/api/categories", categoryRoutes);

import uploadRoutes from "./routes/upload.routes.js";
app.use("/api/upload", uploadRoutes);


// Demo bảo vệ bằng JWT/role
app.get("/api/admin/data", authenticateJWT, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Chỉ admin mới xem được dữ liệu này" });
});

app.get("/api/profile", authenticateJWT, (req, res) => {
  res.json({ message: "Chỉ user đã đăng nhập mới thấy", user: req.user });
});

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Library API is running",
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: `Route ${req.originalUrl} does not exist`,
  });
});

// Error handler cuối cùng (khuyên dùng)
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});


export default app;
