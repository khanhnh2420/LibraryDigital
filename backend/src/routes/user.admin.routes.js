// src/routes/user.admin.routes.js
import { Router } from "express";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  listUsers, getUserById, createUser, updateUserAdmin,
  resetPasswordAdmin, setUserStatus, deleteUser,
} from "../controllers/user.controller.js";

const router = Router();
router.use(authenticateJWT, authorizeRoles("admin","librarian"));

router.get("/", listUsers);
router.get("/:userId", getUserById);
router.post("/", createUser);
router.patch("/:userId", updateUserAdmin);
router.post("/:userId/reset-password", resetPasswordAdmin);
router.patch("/:userId/status", setUserStatus);
router.delete("/:userId", deleteUser);

export default router;
