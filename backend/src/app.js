import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import bookRoutes from "./routes/book.routes.js";
import categoryRoutes from "./routes/category.routes.js";
// import authorRoutes from "./routes/author.routes.js";

import { authenticateJWT, authorizeRoles } from "./middleware/auth.middleware.js";

const app = express();

// Middleware cơ bản
app.use(cors()); // Cho phép CORS
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse form-data
app.use(morgan("dev")); // Log request trong dev


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/categories", categoryRoutes);

app.get("/api/admin/data", authenticateJWT, authorizeRoles("admin"), (req, res) => {
    res.json({ message: "Chỉ admin mới xem được dữ liệu này" });
});

app.get("/api/profile", authenticateJWT, (req, res) => {
  res.json({ message: "Chỉ user đã đăng nhập mới thấy", user: req.user });
});

// Middleware xử lý lỗi
app.get("/api/health", (req, res) => {
    res.status(200).json({ 
        status: "OK", 
        message: "Library API is running",
        timestamp: new Date().toISOString()
    });
});

// 404 
app.use((req, res, next) => {
    res.status(404).json({
        error: "Endpoint not found",
        message: `Route ${req.originalUrl} does not exist`
    });
});

export default app;
