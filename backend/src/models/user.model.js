// models/user.model.js
import { getDB } from "../config/db.js";
import { hashPasswordWithSignature } from "../utils/hash.js";

// Tạo userId: SV<username> | GV<username> | AD<username>
export function generateUserId(role = "student", username = "") {
  const r = String(role || "").toLowerCase();
  const prefix = r === "student" ? "SV" : r === "librarian" ? "GV" : "AD";
  return prefix + String(username || "");
}

export const UserModel = {
  collection: "users",

  getTemplate(role = "student") {
    return {
      userId: null,
      username: null,
      passwordHash: null,
      role,
      status: "active",               // active | banned | suspended
      name: null,
      email: null,
      phone: null,
      department: role === "student" ? null : undefined,
      year: role === "student" ? null : undefined,
      borrowLimit: role === "student" ? 5 : 10,
      refreshToken: null,
      createdAt: new Date(),
      lastLogin: null
    };
  },

  // Tạo user: nhận password thô, model sẽ tự hash + gán userId
  async createUser(userData) {
    const db = getDB();

    const role = (userData.role || "student").toLowerCase();
    const base = {
      ...this.getTemplate(role),
      ...userData
    };

    // userId nếu chưa có thì tự dựng
    base.userId = base.userId || generateUserId(role, base.username);

    // Hash password & xóa password thô
    if (!base.password) {
      throw new Error("Password is required");
    }
    base.passwordHash = await hashPasswordWithSignature(base.password);
    delete base.password;

    // Chuẩn hóa thêm (phòng trường hợp client truyền createdAt/lastLogin lạ)
    base.createdAt = base.createdAt || new Date();
    base.lastLogin = null;

    const result = await db.collection(this.collection).insertOne(base);

    // Trả về thông tin an toàn + insertedId
    const { passwordHash, ...safeUser } = base;
    return { insertedId: result.insertedId, user: { ...safeUser, _id: result.insertedId } };
  },

  async findByEmail(email) {
    const db = getDB();
    return db.collection(this.collection).findOne({ email });
  },

  async findByUsername(username) {
    const db = getDB();
    return db.collection(this.collection).findOne({ username });
  },

  async saveRefreshToken(userId, refreshToken) {
    const db = getDB();
    await db.collection(this.collection).updateOne(
      { userId },
      { $set: { refreshToken, lastLogin: new Date() } }
    );
  }
};
