import express from "express";
import { listLoans } from "../controllers/loans.controller.js";
const router = express.Router();

router.get("/", listLoans);
export default router;
