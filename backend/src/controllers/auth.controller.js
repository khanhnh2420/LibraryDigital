// controllers/auth.controller.js
import { UsersDAO } from "../DAO/user.DAO.js";
import { comparePasswordWithSignature } from "../utils/hash.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";

export const AuthController = {
  // ==================== REGISTER ====================
  registerUser: async (req, res) => {
    try {
      const { username, email, password, role, clientType } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
      }

      const [existEmail, existUsername] = await Promise.all([
        UsersDAO.findByEmail(email),
        UsersDAO.findByUsername(username)
      ]);

      if (existEmail || existUsername) {
        return res.status(400).json({ message: "Tên đăng nhập hoặc email đã tồn tại" });
      }

      // Chỉ cho phép role hợp lệ (admin không được client tạo)
      const allowedRoles = ["student", "teacher"];
      const assignedRole = allowedRoles.includes(role) ? role : "student";

      // Tạo userId dựa trên role + username
      const userIdPrefix = assignedRole === "student" ? "SV" : "GV";
      const userId = userIdPrefix + username;

      const result = await UsersDAO.createUser({
        username,
        email,
        password,
        role: assignedRole,
        userId
      });

      const user = { ...result.user, userId };

      // Nếu client muốn auto-login sau đăng ký (mobile), trả luôn token
      if (clientType === "mobile") {
        const payload = { userId, role: assignedRole };
        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
        await UsersDAO.saveRefreshToken(userId, refreshToken);

        return res.status(201).json({
          message: "Tạo tài khoản thành công",
          user,
          accessToken,
          refreshToken
        });
      }

      return res.status(201).json({ message: "Tạo tài khoản thành công", user });
    } catch (err) {
      console.error("❌ Lỗi khi tạo tài khoản:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ==================== LOGIN ====================
  login: async (req, res) => {
    try {
      const { username, password, clientType } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Vui lòng nhập đủ username và password" });
      }

      const user = await UsersDAO.findByUsername(username);
      if (!user) {
        return res.status(400).json({ message: "Sai username hoặc password" });
      }

      const isMatch = await comparePasswordWithSignature(password, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: "Sai username hoặc password" });
      }

      const payload = { userId: user.userId, role: user.role };
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "30m" });
      const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });

      await UsersDAO.saveRefreshToken(user.userId, refreshToken);

      // Web -> gửi cookie, Mobile -> trả refreshToken JSON
      if (clientType === "web") {
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Strict",
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
        });
      }

      return res.status(200).json({
        message: "Đăng nhập thành công",
        accessToken,
        refreshToken: clientType === "mobile" ? refreshToken : undefined,
        user: {
          userId: user.userId,
          username: user.username,
          role: user.role,
          email: user.email,
          name: user.name,
          phone: user.phone,
        }
      });
    } catch (err) {
      console.error("❌ Lỗi đăng nhập:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ==================== LOGOUT ====================
  logout: async (req, res) => {
    try {
      // Lấy refreshToken từ cookie (web) hoặc body (mobile)
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) return res.sendStatus(204);

      const user = await UsersDAO.findByRefreshToken(refreshToken);
      if (user) {
        await UsersDAO.saveRefreshToken(user.userId, null);
      }

      // Xóa cookie cho web
      if (req.cookies?.refreshToken) {
        res.clearCookie("refreshToken", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Strict"
        });
      }

      return res.status(200).json({ message: "Đăng xuất thành công" });
    } catch (err) {
      console.error("❌ Lỗi logout:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // ==================== REFRESH TOKEN ====================
  refreshAccessToken: async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      console.log(refreshToken)
      if (!refreshToken) return res.status(401).json({ message: "Không có token" });

      const user = await UsersDAO.findByRefreshToken(refreshToken);
      if (!user) return res.status(403).json({ message: "Token không hợp lệ" });

      jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err) => {
        if (err) return res.status(403).json({ message: "Token hết hạn" });

        const payload = { userId: user.userId, role: user.role };
        const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });

        return res.status(200).json({ accessToken: newAccessToken });
      });
    } catch (err) {
      console.error("❌ Lỗi refresh token:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  }
};
