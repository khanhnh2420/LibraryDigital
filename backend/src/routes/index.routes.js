import express from "express";
import bookRoutes from "./book.routes.js";
import categoryRoutes from "./category.routes.js";

const router = express.Router();

// Mount các routes
router.use("/books", bookRoutes);
router.use("/categories", categoryRoutes);

// Health check endpoint
router.get("/health", (req, res) => {
    res.status(200).json({ 
        status: "OK", 
        message: "Library API is running",
        timestamp: new Date().toISOString()
    });
});

// 404 
router.use((req, res, next) => {
    res.status(404).json({
        error: "Endpoint not found",
        message: `Route ${req.originalUrl} does not exist`
    });
});

export default router;