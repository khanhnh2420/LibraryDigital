// src/routes/user.admin.routes.js
import { Router } from "express";
import {
  listUsers, getUserById, createUser, updateUserAdmin,
  resetPasswordAdmin, setUserStatus, deleteUser,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/", listUsers);
router.get("/:userId", getUserById);
router.post("/", createUser);
router.put("/:userId", updateUserAdmin);
router.post("/:userId/reset-password", resetPasswordAdmin);
router.patch("/:userId/status", setUserStatus);
router.delete("/:userId", deleteUser);

export default router;
