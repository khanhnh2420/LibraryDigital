import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware.js";

const router = express.Router();

// 📌 Auth routes
router.post("/register", AuthController.registerUser);
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refreshAccessToken);
router.post("/logout", AuthController.logout);

// 📌 Protected route (test)
router.get("/me", authenticateJWT, (req, res) => {
  res.json({ message: "Lấy thông tin user thành công", user: req.user });
});

// 📌 Ví dụ: route chỉ dành cho admin
router.get("/admin-only", authenticateJWT, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Xin chào Admin!", user: req.user });
});

export default router;
