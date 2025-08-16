// controllers/auth.controller.js
import { UserModel } from "../models/user.model.js";
import { comparePasswordWithSignature } from "../utils/hash.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";

export const AuthController = {
  registerUser: async (req, res) => {
    try {
      const { username, email, password, role = "student" } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
      }

      const [existEmail, existUsername] = await Promise.all([
        UserModel.findByEmail(email),
        UserModel.findByUsername(username)
      ]);
      if (existEmail || existUsername) {
        return res.status(400).json({ message: "Tên đăng nhập hoặc email đã tồn tại" });
      }

      // Model sẽ tự hash password và sinh userId
      const result = await UserModel.createUser({
        username,
        email,
        password,
        role
      });

      return res.status(201).json({
        message: "Tạo tài khoản thành công",
        user: { ...result.user, _id: result.insertedId }
      });
    } catch (err) {
      console.error("❌ Lỗi khi tạo tài khoản:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  login: async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Vui lòng nhập đủ username và password" });
      }

      const user = await UserModel.findByUsername(username);
      if (!user) {
        return res.status(400).json({ message: "Sai username hoặc password" });
      }

      const isMatch = await comparePasswordWithSignature(password, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: "Sai username hoặc password" });
      }

      const payload = { userId: user.userId, role: user.role };
      const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
      const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });

      await UserModel.saveRefreshToken(user.userId, refreshToken);

      return res.status(200).json({
        message: "Đăng nhập thành công",
        accessToken,
        refreshToken,
        user: {
          userId: user.userId,
          username: user.username,
          role: user.role,
          name: user.name
        }
      });
    } catch (err) {
      console.error("❌ Lỗi đăng nhập:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  }
};
