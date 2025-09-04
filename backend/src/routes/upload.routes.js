import express from "express";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { uploadImageMem } from "../middlewares/multerImage.js";
import { uploadBookCoverController } from "../controllers/upload.controller.js";

const router = express.Router();

router.post(
  "/book-cover",
  authenticateJWT,
  authorizeRoles("admin", "librarian"),
  uploadImageMem,
  uploadBookCoverController
);

export default router;
