// src/routes/category.routes.js
import { Router } from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// Public (cho dropdown, search)
router.get("/", CategoryController.list);
router.get("/popular", CategoryController.popular);
router.get("/:categoryId", CategoryController.getOne);

// Admin/Librarian CRUD
router.post(
  "/",
  authenticateJWT,
  authorizeRoles("admin", "librarian"),
  CategoryController.create
);

router.put(
  "/:categoryId",
  authenticateJWT,
  authorizeRoles("admin", "librarian"),
  CategoryController.update
);

router.delete(
  "/:categoryId",
  authenticateJWT,
  authorizeRoles("admin", "librarian"),
  CategoryController.remove
);

export default router;
