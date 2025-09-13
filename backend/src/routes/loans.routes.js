import { Router } from "express";
import { LoanController } from "../controllers/loans.controller.js";
import { authenticateJWT, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = Router();

// Mobile: tạo giữ chỗ
router.post("/batch-hold", authenticateJWT, authorizeRoles("student", "teacher"), LoanController.createHold);

// Staff (admin/librarian): xác nhận tại quầy bằng QR
router.post("/confirm-qr", authenticateJWT, authorizeRoles("admin", "librarian"), LoanController.confirmByQr);

// Staff/Admin: huỷ batch (hoàn tồn phần HOLD)
router.post("/batches/:id/cancel", authenticateJWT, authorizeRoles("admin", "librarian"), LoanController.cancelBatch);

// Admin: list batch
router.get("/batches", authenticateJWT, authorizeRoles("admin", "librarian"), LoanController.listBatches);

export default router;
