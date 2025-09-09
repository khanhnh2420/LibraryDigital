// src/middlewares/rateLimit.js
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

/** Giới hạn chung cho toàn bộ API: tối đa 300 req/phút/IP */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true, // gửi RateLimit-* headers
  legacyHeaders: false,
  message: { message: "Quá nhiều yêu cầu, vui lòng thử lại sau." },
});

/** Làm chậm login sau 5 lần/thời gian cửa sổ */
export const loginSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,       // 15 phút
  delayAfter: 5,                  // sau 5 req/bucket
  delayMs: (hits) => Math.min(hits * 200, 3000), // mỗi req thêm 200ms, tối đa 3s
});

/** Giới hạn số lần login: tối đa 20 lần/15 phút/IP */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Đã vượt quá số lần đăng nhập. Thử lại sau 15 phút." },
});

/** Refresh token: 30 lần/phút/IP */
export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Gọi refresh quá nhanh. Vui lòng chờ." },
});

/** Yêu cầu/ xác nhận reset password: 5 lần/10 phút/IP */
export const resetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Vượt quá số lần thử reset mật khẩu. Thử lại sau ít phút." },
});
