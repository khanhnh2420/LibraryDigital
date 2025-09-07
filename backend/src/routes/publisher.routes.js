// src/routes/publisher.routes.js
import { Router } from "express";
import { PublisherController } from "../controllers/publisher.controller.js";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", authenticateJWT, PublisherController.list);
router.post("/", authenticateJWT, authorizeRoles("admin", "librarian"), PublisherController.create);
router.put("/:publisherId", authenticateJWT, authorizeRoles("admin", "librarian"), PublisherController.update);
router.delete("/:publisherId", authenticateJWT, authorizeRoles("admin", "librarian"), PublisherController.remove);

export default router;
