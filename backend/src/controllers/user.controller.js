// src/controllers/user.controller.js
import { UsersDAO } from "../DAO/user.DAO.js";

/** Helper: lấy chuỗi đã trim (hoặc null nếu rỗng) */
const normStr = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

/** Helper: ép số an toàn (trả null nếu không hợp lệ) */
const toIntOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
};

/** Chỉ cho phép cập nhật những trường này trong “trang cập nhật thông tin” */
const ALLOWED_FIELDS = new Set([
  "name",
  "phone",
  "department",
  "year",
  "gender"
]);

/**
 * GET /auth/me
 * Lấy hồ sơ hiện tại theo userId từ middleware auth (req.user.userId)
 */
export async function getMe(req, res) {
  try {
    const userId = req.user?.userId; // yêu cầu middleware xác thực đã gắn req.user
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const doc = await UsersDAO.findByUserId(userId);
    if (!doc) return res.status(404).json({ message: "User not found" });

    // Ẩn các trường nhạy cảm
    const {
      _id, userId: uid, username, role, status,
      name, email, phone, department, year,
      borrowLimit, createdAt, lastLogin,
      gender, birthday, address,
    } = doc;

    return res.json({
      _id,
      userId: uid,
      username,
      role,
      status,
      name,
      email,
      phone,
      department,
      year,
      borrowLimit,
      createdAt,
      lastLogin,
      gender,
      birthday,
      address,
    });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * PATCH /users/profile
 * Cập nhật hồ sơ người dùng.
 * - Chỉ cho cập nhật các trường trong ALLOWED_FIELDS
 * - Không cho phép sửa email/role/status/borrowLimit/refreshToken/passwordHash
 * - Tùy role “student” thì cho phép department/year, role khác thì bỏ qua 2 trường đó
 */
export async function updateProfile(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await UsersDAO.findByUserId(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Chỉ lấy các trường được phép
    const payload = req.body || {};
    const filtered = {};
    for (const k of Object.keys(payload)) {
      if (ALLOWED_FIELDS.has(k)) filtered[k] = payload[k];
    }

    // Chuẩn hóa dữ liệu
    const upd = {
      ...(filtered.name !== undefined && { name: normStr(filtered.name) }),
      ...(filtered.phone !== undefined && { phone: normStr(filtered.phone) }),
    };

    // department/year chỉ áp dụng cho student
    if (user.role === "student") {
      if (filtered.department !== undefined) {
        upd.department = normStr(filtered.department);
      }
      if (filtered.year !== undefined) {
        const y = toIntOrNull(filtered.year);
        upd.year = y;
      }
    }

    // Validate
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

    // Cập nhật
    const updated = await UsersDAO.updateUser(userId, {
      ...upd,
      updatedAt: new Date(),
    });

    // Trả về hồ sơ an toàn
    const {
      userId: uid, username, status,
      name, email, phone, department, year,
      borrowLimit, lastLogin
    } = updated;

    return res.json({
      userId: uid,
      username,
      status,
      name,
      email,
      phone,
      department,
      year,
      borrowLimit,
      lastLogin,
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
