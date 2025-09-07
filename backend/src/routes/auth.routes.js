import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";

const router = Router();

// FE Dashboard (admin + librarian)
router.post("/staff/login", AuthController.staffLogin);

// client/mobile/web chung
router.post("/login", AuthController.login);
router.post("/register", AuthController.registerUser);
router.post("/logout", AuthController.logout);
router.post("/refresh", AuthController.refreshAccessToken);

export default router;
