import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { LoanDAO } from "./DAO/loan.DAO.js";

const PORT = process.env.PORT || 5000;

// Kết nối DB rồi mới start server
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
  
  // Chạy mỗi 10 phút, hủy các batch "ChoNhan" đã hết hạn và trả tồn
  setInterval(async () => {
    try {
      const { processed } = await LoanDAO.expirePendingBatches(200);
      if (processed) console.log(`⏳ Auto-expired ${processed} pending batches`);
    } catch (e) {
      console.error("Auto-expire error:", e);
    }
  }, 10 * 60 * 1000);
});
