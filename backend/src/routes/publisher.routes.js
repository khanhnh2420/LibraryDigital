import express from "express";
import { PublisherController } from "../controllers/publisher.controller.js";

const router = express.Router();
router.get("/", PublisherController.list);
export default router;
