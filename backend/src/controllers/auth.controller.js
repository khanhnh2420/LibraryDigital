// controllers/auth.controller.js
import { UsersDAO } from "../DAO/user.DAO.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev_refresh_secret";

// staff có quyền vào FE admin
const STAFF_ROLES = new Set(["admin", "librarian"]);

// ----- helpers -----
function issueTokens(user) {
  const payload = { userId: user.userId, role: user.role, username: user.username };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "30m" });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

async function findByUsernameOrEmail(identifier) {
  let user = await UsersDAO.findByUsername(identifier);
  if (!user && identifier?.includes("@")) user = await UsersDAO.findByEmail(identifier);
  return user;
}

// ----- controller -----
export const AuthController = {
  // =============== REGISTER (client) ===============
  async registerUser(req, res) {
    try {
      const { username, email, password, role, clientType } = req.body || {};
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
      }

      const [existEmail, existUsername] = await Promise.all([
        UsersDAO.findByEmail(email),
        UsersDAO.findByUsername(username),
      ]);
      if (existEmail || existUsername) {
        return res.status(400).json({ message: "Tên đăng nhập hoặc email đã tồn tại" });
      }

      const allowedRoles = ["student", "teacher"]; // admin/librarian không cho tự đăng ký
      const assignedRole = allowedRoles.includes(String(role)) ? role : "student";
      const userIdPrefix = assignedRole === "student" ? "SV" : "GV";
      const userId = userIdPrefix + username;

      const { user } = await UsersDAO.createUser({
        userId,
        username,
        email: String(email).trim().toLowerCase(),
        password, // DAO sẽ hash
        role: assignedRole,
        status: "active",
      });

      if (clientType === "mobile") {
        const { accessToken, refreshToken } = issueTokens(user);
        await UsersDAO.saveRefreshToken(userId, refreshToken);
        return res.status(201).json({
          message: "Tạo tài khoản thành công",
          user,
          accessToken,
          refreshToken,
        });
      }

      return res.status(201).json({ message: "Tạo tài khoản thành công", user });
    } catch (err) {
      console.error("❌ Lỗi khi tạo tài khoản:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // =============== LOGIN (FE Dashboard: admin + librarian) ===============
  async staffLogin(req, res) {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ message: "Vui lòng nhập đủ username và password" });
      }

      const user = await findByUsernameOrEmail(username);
      if (!user) return res.status(401).json({ message: "Sai thông tin đăng nhập" });

      if (!STAFF_ROLES.has(user.role)) {
        return res.status(403).json({ message: "Chỉ nhân sự thư viện được phép đăng nhập" });
      }
      if (user.status !== "active") {
        return res.status(403).json({ message: "Tài khoản không ở trạng thái active" });
      }
      if (!user.passwordHash) {
        return res.status(400).json({ message: "Tài khoản chưa có mật khẩu. Hãy đặt lại mật khẩu." });
      }

      const ok = await UsersDAO.verifyPassword(user, password);
      if (!ok) return res.status(401).json({ message: "Sai thông tin đăng nhập" });

      const { accessToken, refreshToken } = issueTokens(user);
      await UsersDAO.saveRefreshToken(user.userId, refreshToken);

      // FE admin (web) – lưu refresh token vào cookie httpOnly
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const { passwordHash, refreshToken: rt, ...safe } = user;
      return res.json({ message: "Đăng nhập thành công", accessToken, user: safe });
    } catch (err) {
      console.error("❌ Lỗi đăng nhập (staff):", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // =============== LOGIN (generic: mobile/web client) ===============
  async login(req, res) {
    try {
      const { username, password, clientType } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ message: "Vui lòng nhập đủ username và password" });
      }

      const user = await findByUsernameOrEmail(username);
      if (!user) return res.status(401).json({ message: "Sai thông tin đăng nhập" });
      if (user.status !== "active") {
        return res.status(403).json({ message: "Tài khoản không ở trạng thái active" });
      }
      if (!user.passwordHash) {
        return res.status(400).json({ message: "Tài khoản chưa có mật khẩu. Hãy đặt lại mật khẩu." });
      }

      const ok = await UsersDAO.verifyPassword(user, password);
      if (!ok) return res.status(401).json({ message: "Sai thông tin đăng nhập" });

      const { accessToken, refreshToken } = issueTokens(user);
      await UsersDAO.saveRefreshToken(user.userId, refreshToken);

      if (clientType === "web") {
        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      const { passwordHash, refreshToken: rt, ...safe } = user;
      return res.json({
        message: "Đăng nhập thành công",
        accessToken,
        refreshToken: clientType === "mobile" ? refreshToken : undefined,
        user: safe,
      });
    } catch (err) {
      console.error("❌ Lỗi đăng nhập:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // =============== LOGOUT ===============
  async logout(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) return res.sendStatus(204);

      const user = await UsersDAO.findByRefreshToken(refreshToken);
      if (user) await UsersDAO.saveRefreshToken(user.userId, null);

      if (req.cookies?.refreshToken) {
        res.clearCookie("refreshToken", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Strict",
        });
      }

      return res.json({ message: "Đăng xuất thành công" });
    } catch (err) {
      console.error("❌ Lỗi logout:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // =============== REFRESH ACCESS TOKEN ===============
  async refreshAccessToken(req, res) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!refreshToken) return res.status(401).json({ message: "Không có token" });

      const user = await UsersDAO.findByRefreshToken(refreshToken);
      if (!user) return res.status(403).json({ message: "Token không hợp lệ" });

      jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err) => {
        if (err) return res.status(403).json({ message: "Token hết hạn" });
        const payload = { userId: user.userId, role: user.role, username: user.username };
        const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
        return res.json({ accessToken: newAccessToken });
      });
    } catch (err) {
      console.error("❌ Lỗi refresh token:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },
};
