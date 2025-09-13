import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import {
  loginLimiter,
  loginSpeedLimiter,
  refreshLimiter,
} from "../middlewares/rateLimit.js";

const router = Router();

// FE Dashboard (admin + librarian)
router.post("/staff/login", AuthController.staffLogin);

// client/mobile/web chung
router.post("/login", loginSpeedLimiter, loginLimiter, AuthController.login);
router.post("/register", AuthController.registerUser);
router.post("/logout", AuthController.logout);
router.post("/refresh-token", refreshLimiter, AuthController.refreshAccessToken);

export default router;
