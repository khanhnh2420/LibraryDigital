// models/user.model.js
import { getDB } from "../config/db.js";
import { hashPasswordWithSignature, comparePasswordWithSignature } from "../utils/hash.js";


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

  // 📌 Tạo user mới
  async createUser(userData) {
    const db = getDB();

    const role = (userData.role || "student").toLowerCase();
    const base = {
      ...this.getTemplate(role),
      ...userData
    };

    // Hash password & xóa password thô
    if (!base.password) {
      throw new Error("Password is required");
    }
    base.passwordHash = await hashPasswordWithSignature(base.password);
    delete base.password;

    // Chuẩn hóa thêm
    base.createdAt = base.createdAt || new Date();
    base.lastLogin = null;

    const result = await db.collection(this.collection).insertOne(base);

    // Trả về thông tin an toàn
    const { passwordHash, ...safeUser } = base;
    return { insertedId: result.insertedId, user: { ...safeUser, _id: result.insertedId } };
  },

  // 📌 Tìm user theo email
  async findByEmail(email) {
    const db = getDB();
    return db.collection(this.collection).findOne({ email });
  },

  // 📌 Tìm user theo username
  async findByUsername(username) {
    const db = getDB();
    return db.collection(this.collection).findOne({ username });
  },

  // 📌 Tìm user theo userId
  async findByUserId(userId) {
    const db = getDB();
    return db.collection(this.collection).findOne({ userId });
  },

  // 📌 Tìm user theo refreshToken (phục vụ logout / refresh token)
  async findByRefreshToken(refreshToken) {
    const db = getDB();
    return db.collection(this.collection).findOne({ refreshToken });
  },

  // 📌 Lưu refreshToken
  async saveRefreshToken(userId, refreshToken) {
    const db = getDB();
    await db.collection(this.collection).updateOne(
      { userId },
      { $set: { refreshToken, lastLogin: new Date() } }
    );
  },

  // 📌 Xóa refreshToken (logout)
  async removeRefreshToken(userId) {
    const db = getDB();
    await db.collection(this.collection).updateOne(
      { userId },
      { $set: { refreshToken: null } }
    );
  },

  // 📌 So sánh mật khẩu khi login
  async verifyPassword(user, rawPassword) {
    return comparePasswordWithSignature(rawPassword, user.passwordHash);
  },

  // 📌 Cập nhật thông tin user (profile update)
  async updateUser(userId, updates) {
    const db = getDB();
    const { password, ...rest } = updates;

    const updateDoc = { ...rest };
    if (password) {
      updateDoc.passwordHash = await hashPasswordWithSignature(password);
    }

    await db.collection(this.collection).updateOne({ userId }, { $set: updateDoc });
    return this.findByUserId(userId);
  }
};
