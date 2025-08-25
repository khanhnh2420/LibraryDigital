import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export const authenticateJWT = (req, res, next) => {
  try {
    let token = null;

    // 1️⃣ Ưu tiên lấy từ header (Authorization: Bearer xxx) -> dùng cho Mobile
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2️⃣ Nếu không có thì thử lấy từ cookie (dùng cho Web)
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ message: "Chưa đăng nhập hoặc thiếu token" });
    }

    // Verify token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(403).json({ message: "Token không hợp lệ hoặc hết hạn" });

      req.user = decoded; // { userId, role }
      next();
    });
  } catch (err) {
    console.error("❌ Middleware Auth error:", err);
    return res.status(500).json({ message: "Lỗi xác thực" });
  }
};

// Middleware kiểm tra quyền
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Chưa đăng nhập" });

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    next();
  };
};
