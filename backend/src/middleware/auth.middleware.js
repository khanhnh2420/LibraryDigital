// src/middlewares/authenticateJWT.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UsersDAO } from "../DAO/user.DAO.js"; // kiểm tra đúng đường dẫn + chữ hoa/thường
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export const authenticateJWT = async (req, res, next) => {
  try {
    let token = null;

    // 1) Header: Authorization: Bearer <token>
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    // 2) Cookie: accessToken
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    if (!token) {
      return res.status(401).json({ message: "Chưa đăng nhập hoặc thiếu token" });
    }

    //Verify đồng bộ để lấy decoded
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ message: "Token không hợp lệ hoặc hết hạn" });
    }
    // console.log("decoded:", decoded); // { userId, role, iat, exp }

    //Tải user từ DB (await)
    const user = await UsersDAO.findByUserId(decoded.userId);
    if (!user) return res.status(404).json({ message: "User không tồn tại" });
    if (user.status === "banned") return res.status(403).json({ message: "Tài khoản bị khóa" });

    // Gắn user rút gọn vào req
    req.user = { userId: user.userId, role: user.role };
    return next();
  } catch (err) {
    console.error("Middleware Auth error:", err);
    return res.status(500).json({ message: "Lỗi xác thực" });
  }
};

export const authMiddleware = authenticateJWT;

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }
    next();
  };
};
