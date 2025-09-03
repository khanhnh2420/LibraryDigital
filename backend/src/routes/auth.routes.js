import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();


router.post("/register", AuthController.registerUser);
router.post("/login", AuthController.login);
router.post("/refresh-token", AuthController.refreshAccessToken);
router.post("/logout", AuthController.logout);


router.get("/me", authenticateJWT, (req, res) => {
  res.json({ message: "Lấy thông tin user thành công", user: req.user });
});

// route chỉ dành cho admin
router.get("/admin-only", authenticateJWT, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Xin chào Admin!", user: req.user });
});

console.log('✅ Auth loaded successfully');
export default router;
