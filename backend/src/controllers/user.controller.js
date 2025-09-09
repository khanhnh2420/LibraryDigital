// src/controllers/user.controller.js
import { UsersDAO } from "../DAO/user.DAO.js";


/** Helpers */
const normStr = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};
const toIntOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};
const safeUser = (u) => {
  if (!u) return null;
  const {
    _id, passwordHash, refreshToken, normalizedEmail, normalizedUsername,
    ...rest
  } = u;
  return rest;
};
const mapDaoError = (e) => {
  const msg = String(e?.message || "");
  if (msg.includes("EMAIL_TAKEN")) return { code: 409, message: "Email đã được sử dụng" };
  if (msg.includes("USERNAME_TAKEN")) return { code: 409, message: "Username đã được sử dụng" };
  if (msg.includes("USERID_TAKEN")) return { code: 409, message: "Mã người dùng (userId) đã tồn tại" };
  if (msg.includes("Password is required")) return { code: 400, message: "Thiếu mật khẩu" };
  return { code: 500, message: "Internal server error" };
};

/** ========== SELF PROFILE ========== */

/** GET /auth/me */
export async function getMe(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const doc = await UsersDAO.findByUserId(userId);
    if (!doc) return res.status(404).json({ message: "User not found" });

    return res.json(safeUser(doc));
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

const PROFILE_ALLOWED_FIELDS = new Set(["name", "phone", "department", "year", "gender", "address", "birthday"]);

/** PATCH /users/profile */
export async function updateProfile(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await UsersDAO.findByUserId(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const payload = req.body || {};
    const filtered = {};
    for (const k of Object.keys(payload)) {
      if (PROFILE_ALLOWED_FIELDS.has(k)) filtered[k] = payload[k];
    }

    const upd = {
      ...(filtered.name !== undefined && { name: normStr(filtered.name) }),
      ...(filtered.phone !== undefined && { phone: normStr(filtered.phone) }),
      ...(filtered.gender !== undefined && { gender: normStr(filtered.gender) }),
      ...(filtered.address !== undefined && { address: normStr(filtered.address) }),
      ...(filtered.birthday !== undefined && { birthday: normStr(filtered.birthday) }),
    };

    // department/year chỉ cho student
    if (user.role === "student") {
      if (filtered.department !== undefined) upd.department = normStr(filtered.department);
      if (filtered.year !== undefined) upd.year = toIntOrNull(filtered.year);
    }

    //  validate
    if (upd.name !== undefined && !upd.name) {
      return res.status(400).json({ message: "Họ và tên không được để trống" });
    }
    if (upd.phone && !/^\+?\d[\d\s\-]{6,}$/.test(upd.phone)) {
      return res.status(400).json({ message: "Số điện thoại không hợp lệ" });
    }
    if (user.role === "student" && upd.year !== undefined && upd.year !== null) {
      if (upd.year < 1 || upd.year > 10) {
        return res.status(400).json({ message: "Năm học không hợp lệ (1-10)" });
      }
    }

    const updated = await UsersDAO.updateUser(userId, { ...upd, updatedAt: new Date() });
    return res.json(safeUser(updated));
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** POST /users/change-password (self) { oldPassword, newPassword } */
export async function changePasswordSelf(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ message: "Thiếu mật khẩu" });

    const user = await UsersDAO.findByUserId(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await UsersDAO.verifyPassword(user, oldPassword);
    if (!ok) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });

    const updated = await UsersDAO.updateUser(userId, { password: newPassword, updatedAt: new Date() });
    return res.json({ message: "Đổi mật khẩu thành công", user: safeUser(updated) });
  } catch (err) {
    console.error("changePasswordSelf error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** ========== ADMIN AREA ========== */

/** GET /admin/users (paged) ?page=&pageSize=&q=&role=&status= */
export async function listUsers(req, res) {
  try {
    const { page, pageSize, q, role, status } = req.query || {};
    const result = await UsersDAO.listPaged({ page, pageSize, q, role, status });
    result.items = result.items.map(safeUser);
    return res.json(result);
  } catch (err) {
    console.error("listUsers error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** GET /admin/users/:userId */
export async function getUserById(req, res) {
  try {
    const { userId } = req.params;
    const u = await UsersDAO.findByUserId(userId);
    if (!u) return res.status(404).json({ message: "User not found" });
    return res.json(safeUser(u));
  } catch (err) {
    console.error("getUserById error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** POST /admin/users  (create) */
export async function createUser(req, res) {
  try {
    const body = req.body || {};
    // Một vài validate cơ bản
    if (!normStr(body.userId)) return res.status(400).json({ message: "userId là bắt buộc" });
    if (!normStr(body.username)) return res.status(400).json({ message: "username là bắt buộc" });
    if (!normStr(body.password)) return res.status(400).json({ message: "password là bắt buộc" });
    if (!normStr(body.name)) return res.status(400).json({ message: "name là bắt buộc" });

    const ret = await UsersDAO.createUser(body);
    return res.status(201).json({ message: "Tạo user thành công", user: safeUser(ret.user) });
  } catch (err) {
    console.error("createUser error:", err);
    const ex = mapDaoError(err);
    return res.status(ex.code).json({ message: ex.message });
  }
}

/** PATCH /admin/users/:userId  (admin cập nhật) */
export async function updateUserAdmin(req, res) {
  try {
    const { userId } = req.params;
    const updates = req.body || {};

    // Giới hạn các trường được phép thay đổi ở admin:
    // name, email, username, phone, role, status, department, year, borrowLimit, isActive
    const allowed = new Set([
      "name", "email", "username", "phone",
      "role", "status", "department", "year", "borrowLimit", "isActive",
      //"gender", "address", "birthday"
      "gender", "address", "birthday",
    ]);
    const filtered = {};
    for (const k of Object.keys(updates)) {
      if (allowed.has(k)) filtered[k] = updates[k];
    }

    // chuẩn hóa số
    if ("borrowLimit" in filtered) filtered.borrowLimit = toIntOrNull(filtered.borrowLimit);
    if ("year" in filtered) filtered.year = toIntOrNull(filtered.year);

    const updated = await UsersDAO.updateUser(userId, { ...filtered, updatedAt: new Date() });
    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "Cập nhật thành công", user: safeUser(updated) });
  } catch (err) {
    console.error("updateUserAdmin error:", err);
    const ex = mapDaoError(err);
    return res.status(ex.code).json({ message: ex.message });
  }
}

/** POST /admin/users/:userId/reset-password  { newPassword } */
export async function resetPasswordAdmin(req, res) {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body || {};
    if (!normStr(newPassword)) return res.status(400).json({ message: "Thiếu mật khẩu mới" });

    const updated = await UsersDAO.updateUser(userId, { password: newPassword, updatedAt: new Date() });
    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "Đặt lại mật khẩu thành công", user: safeUser(updated) });
  } catch (err) {
    console.error("resetPasswordAdmin error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** PATCH /admin/users/:userId/status  { status } */
export async function setUserStatus(req, res) {
  try {
    const { userId } = req.params;
    const { status } = req.body || {};
    if (!["active", "banned", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Trạng thái không hợp lệ" });
    }
    const updated = await UsersDAO.updateUser(userId, { status, updatedAt: new Date() });
    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "Cập nhật trạng thái thành công", user: safeUser(updated) });
  } catch (err) {
    console.error("setUserStatus error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** DELETE /admin/users/:userId */
export async function deleteUser(req, res) {
  try {
    const { userId } = req.params;

    // kiểm tra ràng buộc: nếu có loans đang active → không xoá
    // const db = await getDB();
    // const activeLoans = await db.collection("loans").countDocuments({ userId, status: { $in: ["DangMuon", "ChoNhan"] } });
    // if (activeLoans > 0) return res.status(409).json({ message: "Không thể xoá: user đang có phiếu mượn hoạt động" });

    // Ở đây dùng soft delete (đổi isActive=false) hoặc hard delete tuỳ nhu cầu:
    const updated = await UsersDAO.updateUser(userId, { isActive: false, status: "suspended", updatedAt: new Date() });
    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "Đã vô hiệu hoá user", user: safeUser(updated) });
  } catch (err) {
    console.error("deleteUser error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
