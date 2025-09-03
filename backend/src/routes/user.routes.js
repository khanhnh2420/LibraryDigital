// src/routes/user.routes.js
import { Router } from "express";
import { getMe, updateProfile } from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/auth/me", authMiddleware, getMe);
router.patch("/profile", authMiddleware, updateProfile);

export default router;
