// import { LoanDAO } from "../DAO/loan.DAO.js";

// export const LoanController = {
//   // Mobile: tạo batch giữ chỗ 24h (trừ tồn ngay)
//   async createHold(req, res) {
//     try {
//       const userId = req.user?.userId;
//       const { items } = req.body || {};
//       const out = await LoanDAO.createHoldBatch({ userId, items });
//       return res.status(201).json(out);
//     } catch (e) {
//       if (String(e.message || "").startsWith("INSUFFICIENT_STOCK:")) {
//         const bookId = e.message.split(":")[1];
//         return res.status(409).json({ message: `Không đủ tồn cho sách ${bookId}` });
//       }
//       if (e.message === "INVALID_INPUT") return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
//       console.error("createHold error:", e);
//       return res.status(500).json({ message: "Lỗi server" });
//     }
//   },

//   // Staff: xác nhận bằng QR token
//   async confirmByQr(req, res) {
//     try {
//       const { qrToken } = req.body || {};
//       const confirmerId = req.user?.userId;
//       const out = await LoanDAO.confirmByQrToken({ qrToken, confirmerId });
//       return res.json(out);
//     } catch (e) {
//       const msg = e.message;
//       if (msg === "QR_REQUIRED") return res.status(400).json({ message: "Thiếu QR token" });
//       if (msg === "QR_INVALID_OR_EXPIRED" || msg === "QR_EXPIRED") {
//         return res.status(400).json({ message: "QR không hợp lệ hoặc đã hết hạn" });
//       }
//       if (msg === "NO_LOANS_TO_CONFIRM") {
//         return res.status(409).json({ message: "Phiếu đã xử lý hoặc không còn sách để nhận" });
//       }
//       console.error("confirmByQr error:", e);
//       return res.status(500).json({ message: "Lỗi server" });
//     }
//   },

//   // Admin/Staff: huỷ batch (hoàn tồn phần còn HOLD)
//   async cancelBatch(req, res) {
//     try {
//       const { id } = req.params;
//       const { reason } = req.body || {};
//       const out = await LoanDAO.cancelBatch(id, reason || "cancelled_by_staff");
//       return res.json(out);
//     } catch (e) {
//       if (e.message === "BATCH_NOT_FOUND") return res.status(404).json({ message: "Không tìm thấy phiếu" });
//       if (e.message === "BATCH_NOT_HOLD") return res.status(409).json({ message: "Phiếu không ở trạng thái chờ nhận" });
//       console.error("cancelBatch error:", e);
//       return res.status(500).json({ message: "Lỗi server" });
//     }
//   },

//   // Admin: danh sách batch
//   async listBatches(req, res) {
//     try {
//       const { page, pageSize, status, q } = req.query;
//       const out = await LoanDAO.listBatches({ page, pageSize, status, q });
//       return res.json(out);
//     } catch (e) {
//       console.error("listBatches error:", e);
//       return res.status(500).json({ message: "Lỗi server" });
//     }
//   },
// };
