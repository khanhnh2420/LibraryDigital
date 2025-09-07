// src/models/user.DAO.js
import { getDB } from "../config/db.js";
import { hashPasswordWithSignature, comparePasswordWithSignature } from "../utils/hash.js";
import { escapeRegex } from "../utils/regex.js";

function normStr(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}
function lowerOrNull(v) {
  const s = normStr(v);
  return s ? s.toLowerCase() : null;
}
function toIntOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Dùng cho list/paged để ẩn field nhạy cảm
const SAFE_PROJECTION = { passwordHash: 0, refreshToken: 0 };

export const UsersDAO = {
  collection: "users",

  getTemplate(role = "student") {
    const r = (role || "student").toLowerCase();
    return {
      userId: null,
      username: null,         // lưu lowercase
      passwordHash: null,
      role: ["admin", "librarian", "student"].includes(r) ? r : "student",
      status: "active",       // active | banned | suspended
      name: null,
      email: null,            // lưu lowercase
      phone: null,
      department: r === "student" ? null : undefined,
      year: r === "student" ? null : undefined,
      borrowLimit: r === "student" ? 5 : 10,
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: null,
      isActive: true,
    };
  },

  // ========== CREATE ==========
  async createUser(userData) {
    const db = await getDB();
    const col = db.collection(this.collection);

    const role = (userData.role || "student").toLowerCase();
    const now = new Date();

    const doc = {
      ...this.getTemplate(role),
      userId: normStr(userData.userId),
      username: lowerOrNull(userData.username),           // lưu lowercase
      name: normStr(userData.name),
      email: lowerOrNull(userData.email),                 // lưu lowercase
      phone: normStr(userData.phone),
      department: role === "student" ? normStr(userData.department) : undefined,
      year: role === "student" ? toIntOrNull(userData.year) : undefined,
      borrowLimit: toIntOrNull(userData.borrowLimit) ?? (role === "student" ? 5 : 10),
      status: normStr(userData.status) || "active",
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
      isActive: userData.isActive === false ? false : true,
    };

    if (!userData.password || !String(userData.password).trim()) {
      throw new Error("Password is required");
    }
    doc.passwordHash = await hashPasswordWithSignature(String(userData.password));

    // Check trùng trực tiếp trên username/email (đã lowercase)
    if (doc.username) {
      const dupU = await col.findOne({ username: doc.username }, { projection: { _id: 1 } });
      if (dupU) throw new Error("USERNAME_TAKEN");
    }
    if (doc.email) {
      const dupE = await col.findOne({ email: doc.email }, { projection: { _id: 1 } });
      if (dupE) throw new Error("EMAIL_TAKEN");
    }
    if (doc.userId) {
      const dupId = await col.findOne({ userId: doc.userId }, { projection: { _id: 1 } });
      if (dupId) throw new Error("USERID_TAKEN");
    }

    const result = await col.insertOne(doc);

    const { passwordHash, refreshToken, ...safeUser } = doc;
    return { insertedId: result.insertedId, user: { ...safeUser, _id: result.insertedId } };
  },

  // ========== FINDERS (KHÔNG projection để dùng cho login) ==========
  async findByEmail(email) {
    const db = await getDB();
    return db.collection(this.collection).findOne({ email: lowerOrNull(email) });
  },

  async findByUsername(username) {
    const db = await getDB();
    return db.collection(this.collection).findOne({ username: lowerOrNull(username) });
  },

  async findByUserId(userId) {
    const db = await getDB();
    return db.collection(this.collection).findOne({ userId });
  },

  async findByRefreshToken(refreshToken) {
    const db = await getDB();
    return db.collection(this.collection).findOne({ refreshToken });
  },

  // ========== TOKENS ==========
  async saveRefreshToken(userId, refreshToken) {
    const db = await getDB();
    await db.collection(this.collection).updateOne(
      { userId },
      { $set: { refreshToken, lastLogin: new Date() } }
    );
  },

  async removeRefreshToken(userId) {
    const db = await getDB();
    await db.collection(this.collection).updateOne(
      { userId },
      { $set: { refreshToken: null } }
    );
  },

  // ========== AUTH ==========
  async verifyPassword(user, rawPassword) {
    return comparePasswordWithSignature(rawPassword, user.passwordHash);
  },

  // ========== UPDATE ==========
  async updateUser(userId, updates) {
    const db = await getDB();
    const col = db.collection(this.collection);

    const { password, email, username, ...rest } = updates;
    const setDoc = { ...rest };

    if (password && String(password).trim()) {
      setDoc.passwordHash = await hashPasswordWithSignature(String(password));
    }

    if (email !== undefined) {
      const e = lowerOrNull(email); // lưu lowercase
      if (e) {
        const dup = await col.findOne({ email: e, userId: { $ne: userId } }, { projection: { _id: 1 } });
        if (dup) throw new Error("EMAIL_TAKEN");
      }
      setDoc.email = e;
    }

    if (username !== undefined) {
      const u = lowerOrNull(username); // lưu lowercase
      if (u) {
        const dup = await col.findOne({ username: u, userId: { $ne: userId } }, { projection: { _id: 1 } });
        if (dup) throw new Error("USERNAME_TAKEN");
      }
      setDoc.username = u;
    }

    if ("borrowLimit" in setDoc) setDoc.borrowLimit = toIntOrNull(setDoc.borrowLimit) ?? 5;
    if ("year" in setDoc) setDoc.year = toIntOrNull(setDoc.year);

    setDoc.updatedAt = new Date();

    await col.updateOne({ userId }, { $set: setDoc });
    return this.findByUserId(userId);
  },

  // ========== LIST/PAGED (ẩn field nhạy cảm) ==========
  async listPaged({ page = 1, pageSize = 10, q = "", role, status, sort = "createdAt", order = "desc" } = {}) {
    const db = await getDB();
    const col = db.collection(this.collection);

    page = Math.max(1, parseInt(page, 10) || 1);
    pageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));

    const match = {};
    const qq = (q || "").trim();

    if (qq) {
      // cú pháp nâng cao: id:SV..., email:abc@x.com, user:tên
      const mId = /^id:(.+)$/i.exec(qq);
      const mEmail = /^email:(.+)$/i.exec(qq);
      const mUser = /^(?:user|username):(.+)$/i.exec(qq);

      if (mId) {
        match.userId = mId[1].trim();
      } else if (mEmail) {
        const rx = new RegExp("^" + escapeRegex(mEmail[1].trim().toLowerCase()) + "$", "i");
        match.email = rx;
      } else if (mUser) {
        const rx = new RegExp(escapeRegex(mUser[1].trim().toLowerCase()), "i");
        match.username = rx;
      } else {
        const rx = new RegExp(escapeRegex(qq.toLowerCase()), "i");
        match.$or = [
          { userId: rx },
          { name: new RegExp(escapeRegex(qq), "i") }, // tên giữ nguyên hoa/thường người dùng nhập
          { username: rx }, // đã lưu lowercase nên so khớp i
          { email: rx },
        ];
      }
    }

    if (role) match.role = role;
    if (status) match.status = status;

    const allowedSorts = new Set(["createdAt", "lastLogin", "name", "username", "userId"]);
    const sortField = allowedSorts.has(String(sort)) ? String(sort) : "createdAt";
    const sortOrder = String(order).toLowerCase() === "asc" ? 1 : -1;

    const total = await col.countDocuments(match);
    const items = await col
      .find(match, { projection: SAFE_PROJECTION })
      .sort({ [sortField]: sortOrder, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    return { items, total, page, pageSize };
  },

  // ========== HELPERS ==========
  async getMapByUserIds(userIds = []) {
    if (!userIds?.length) return {};
    const db = await getDB();

    const docs = await db
      .collection(this.collection)
      .find({ userId: { $in: Array.from(new Set(userIds)) } })
      .project({ _id: 0, userId: 1, name: 1, displayName: 1, fullName: 1 })
      .toArray();

    const map = {};
    for (const u of docs) {
      map[u.userId] = { name: u.name || u.displayName || u.fullName || "Bạn đọc" };
    }
    return map;
  },
};
