import express from "express";
import { listBatches } from "../controllers/batches.controller.js";
const router = express.Router();

router.get("/", listBatches);
export default router;
