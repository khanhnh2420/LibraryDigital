// src/routes/profile.routes.js
import { Router } from "express";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { getMe, updateProfile, changePasswordSelf } from "../controllers/user.controller.js";

const router = Router();
router.use(authenticateJWT, authorizeRoles("student", "teacher"));

router.get("/me", getMe);
router.patch("/profile", updateProfile);
router.post("/change-password", changePasswordSelf);

export default router;
