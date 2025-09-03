import { Router } from "express";
import { CommentController } from "../controllers/comment.controller.js";

const router = Router();

// 🔄 Mặc định trả kèm replies preview
router.get("/:bookId/comments", CommentController.listThreadsWithReplies);

// (Tùy chọn) chỉ threads — nếu bạn cần endpoint gọn
router.get("/:bookId/comments-plain", CommentController.listThreads);

// Replies phân trang cho 1 thread (có offset để bỏ qua preview đã hiển thị)
router.get("/:parentId/replies", CommentController.listReplies);

// CRUD tối giản
router.post("/creatComment", CommentController.createRoot);
router.post("/:parentId/reply", CommentController.createReply);
router.patch("/:id", CommentController.edit);
router.delete("/:id", CommentController.softDelete);

// like/unlike
router.post("/:id/toggle-like", CommentController.toggleLike);

export default router;
