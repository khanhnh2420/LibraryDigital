// src/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UsersDAO } from "../DAO/user.DAO.js";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

/**
 * Xác thực access token.
 * - Lấy token từ Authorization: Bearer <token>
 * - (Không lấy từ cookie, vì chỉ set refreshToken ở cookie)
 * - Tải user từ DB để kiểm tra status/role.
 */
export async function authenticateJWT(req, res, next) {
  try {
    let token = null;

    // Lấy từ header Authorization
    const auth = req.headers.authorization || req.headers.Authorization;
    if (auth && typeof auth === "string") {
      const [scheme, value] = auth.split(" ");
      if (/^Bearer$/i.test(scheme) && value) token = value.trim();
    }

    if (!token) {
      return res.status(401).json({ message: "Chưa đăng nhập hoặc thiếu token" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET); // { userId, role, username, iat, exp }
    } catch {
      return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }

    // Tải user để kiểm tra trạng thái (và có thể đồng bộ role)
    const user = await UsersDAO.findByUserId(decoded.userId);
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    // Không cho qua nếu không active
    if (user.status === "banned" || user.status === "suspended" || user.isActive === false) {
      return res.status(403).json({ message: "Tài khoản không được phép truy cập" });
    }

    // Gắn user vào req (chỉ các field cần thiết)
    req.user = {
      userId: user.userId,
      role: user.role,
      username: user.username,
    };

    next();
  } catch (err) {
    console.error("Middleware Auth error:", err);
    return res.status(500).json({ message: "Lỗi xác thực" });
  }
}

/**
 * Kiểm tra quyền theo role.
 * Ví dụ: authorizeRoles("admin", "librarian")
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }
    next();
  };
}
