import express from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = express.Router();

// Đăng ký
router.post("/register", AuthController.registerUser);
// Đăng nhập
router.post("/login", AuthController.login);

console.log('✅ Auth loaded successfully');

export default router;
