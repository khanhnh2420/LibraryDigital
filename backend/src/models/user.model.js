// models/user.model.js
import { getDB } from "../config/db.js";

function generateUserId(role,username) {
  const prefix = role === "student" ? "SV" : role === "librarian" ? "GV" : "AD";
  return prefix + username;
}

export const UserModel = {
  collection: "users",

  getTemplate(role = "student") {
    return {
      userId: null, // VD: SV001 hoặc GV002
      username: null,
      passwordHash: null,
      role: role, // student / librarian / admin
      status: "active", // active / banned / suspended
      name: null,
      email: null,
      phone: null,
      department: role === "student" ? null : undefined, // Chỉ có khi là student
      year: role === "student" ? null : undefined,
      borrowLimit: role === "student" ? 5 : 10, // Ví dụ admin/librarian có limit khác
      refreshToken: null,
      createdAt: new Date(),
      lastLogin: null
    };
  },

  async create(userData) {
    const db = getDB();
    return await db.collection(this.collection).insertOne(userData);
  },

  async findByEmail(email) {
    const db = getDB();
    return await db.collection(this.collection).findOne({ email });
  },

  async findByUsername(username) {
    const db = getDB();
    return await db.collection(this.collection).findOne({ username });
  }
};
