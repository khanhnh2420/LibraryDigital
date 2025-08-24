import express from "express";
import cors from "cors";
import morgan from "morgan";


import authRoutes from "./routes/auth.routes.js";
import bookRoutes from "./routes/book.routes.js";
// import errorMiddleware from "./middlewares/error.middleware.js";

const app = express();

// Middleware cơ bản
app.use(cors()); // Cho phép CORS
app.use(express.json()); // Parse JSON
app.use(express.urlencoded({ extended: true })); // Parse form-data
app.use(morgan("dev")); // Log request trong dev


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);

// Middleware xử lý lỗi
// app.use(errorMiddleware);

export default app;
