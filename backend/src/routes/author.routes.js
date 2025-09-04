import express from "express";
import { AuthorController } from "../controllers/author.controller.js";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", authenticateJWT, authorizeRoles("admin","librarian"), AuthorController.list);
// router.get("/", AuthorController.list);

export default router;
