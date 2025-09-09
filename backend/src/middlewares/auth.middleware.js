// src/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UsersDAO } from "../DAO/user.DAO.js";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export async function authenticateJWT(req, res, next) {
  try {
    let token = null;
    const auth = req.headers.authorization || req.headers.Authorization;
    if (auth && typeof auth === "string") {
      const [scheme, value] = auth.split(" ");
      if (/^Bearer$/i.test(scheme) && value) token = value.trim();
    }
    if (!token) return res.status(401).json({ message: "Chưa đăng nhập hoặc thiếu token" });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET); // { userId, role, username, iat, exp }
    } catch {
      return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }

    const user = await UsersDAO.findByUserId(decoded.userId);
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    // Chặn theo trạng thái (giữ nguyên logic của bạn)
    if (user.status === "banned" || user.status === "suspended" || user.isActive === false) {
      return res.status(403).json({ message: "Tài khoản không được phép truy cập" });
    }

    // CHỖ QUAN TRỌNG: chuẩn hoá role (ưu tiên DB, fallback JWT), toLowerCase + trim
    const dbRole = (user.role ?? "").toString().trim().toLowerCase();
    const jwtRole = (decoded.role ?? "").toString().trim().toLowerCase();
    const effectiveRole = dbRole || jwtRole; // ưu tiên DB; nếu DB rỗng thì dùng JWT

    req.user = {
      userId: user.userId,
      role: effectiveRole,   
      username: user.username,
    };

    // console.log("Auth OK", { userId: req.user.userId, role: req.user.role });

    next();
  } catch (err) {
    console.error("Middleware Auth error:", err);
    return res.status(500).json({ message: "Lỗi xác thực" });
  }
}

export function authorizeRoles(...allowedRoles) {
  const allow = new Set(allowedRoles.map(r => String(r).trim().toLowerCase()));
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Chưa đăng nhập" });
    const current = (req.user.role ?? "").toString().trim().toLowerCase();

    if (!allow.has(current)) {
      // console.warn("RBAC FORBIDDEN", { need: [...allow], got: current, userId: req.user.userId });
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }
    next();
  };
}
