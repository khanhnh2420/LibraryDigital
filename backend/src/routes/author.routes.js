// src/routes/author.routes.js
import { Router } from "express";
import { AuthorController } from "../controllers/author.controller.js";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticateJWT, AuthorController.list);
router.post("/", authenticateJWT, authorizeRoles("admin", "librarian"), AuthorController.create);
router.put("/:authorId", authenticateJWT, authorizeRoles("admin", "librarian"), AuthorController.update);
router.delete("/:authorId", authenticateJWT, authorizeRoles("admin", "librarian"), AuthorController.remove);

export default router;
