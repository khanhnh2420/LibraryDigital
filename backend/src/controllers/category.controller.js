// src/controllers/category.controller.js
import { CategoryDAO } from "../DAO/category.DAO.js";

const toInt = (v, d = 0) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? d : n;
};

export const CategoryController = {
  /** GET /categories/all */
  async getAllCategories(req, res) {
    try {
      const categories = await CategoryDAO.getAllCategories();
      return res.status(200).json(categories);
    } catch (err) {
      console.error("❌ Category.getAllCategories:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  /** GET /categories?page=&limit=&q=&ids=CAT001,CAT002
   *  Alias: pageSize -> limit (tương thích FE cũ) */
  async list(req, res) {
    try {
      const limit = Math.min(100, Math.max(1, toInt(req.query.limit ?? req.query.pageSize, 50)));
      const page = Math.max(1, toInt(req.query.page, 1));
      const q = (req.query.q || "").trim();
      const ids = req.query.ids
        ? String(req.query.ids).split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const data = await CategoryDAO.list({ q, limit, page, ids });
      // DAO trả { items, total, page, pageSize }; thêm trường limit cho rõ
      return res.json({ ...data, limit: data.pageSize });
    } catch (e) {
      console.error("❌ Category.list:", e);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  /** GET /categories/:categoryId */
  async getCategoryById(req, res) {
    try {
      const { categoryId } = req.params || {};
      if (!categoryId) return res.status(400).json({ message: "Thiếu categoryId" });

      const doc = await CategoryDAO.getCategoryById(String(categoryId));
      if (!doc) return res.status(404).json({ message: "Không tìm thấy danh mục" });

      return res.json(doc);
    } catch (e) {
      console.error("❌ Category.getCategoryById:", e);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  /** GET /categories/search?q=  hoặc /categories/search/:searchTerm */
  async searchCategories(req, res) {
    try {
      const q = (req.query.q ?? req.params.searchTerm ?? "").trim();
      const items = await CategoryDAO.searchCategories(q);
      return res.json(items);
    } catch (e) {
      console.error("❌ Category.searchCategories:", e);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  /** GET /categories/popular?limit=  hoặc /categories/popular/:limit? */
  async getPopularCategories(req, res) {
    try {
      const raw = req.query.limit ?? req.params.limit;
      const limit = Math.min(50, Math.max(1, toInt(raw, 5)));
      const items = await CategoryDAO.getPopularCategories(limit);
      return res.json(items);
    } catch (e) {
      console.error("❌ Category.getPopularCategories:", e);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  /** POST /categories */
  async create(req, res) {
    try {
      const created = await CategoryDAO.createCategory(req.body || {});
      return res.status(201).json(created);
    } catch (e) {
      if (e?.code === "VALIDATION_ERROR" || String(e.message || "").startsWith("VALIDATION_ERROR")) {
        return res.status(400).json({ message: "Dữ liệu không hợp lệ", detail: e.message });
      }
      if (e?.code === 11000) {
        return res.status(409).json({ message: "Danh mục đã tồn tại (trùng unique key)" });
      }
      console.error("❌ Category.create:", e);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  /** PUT /categories/:categoryId */
  async update(req, res) {
    try {
      const { categoryId } = req.params || {};
      if (!categoryId) return res.status(400).json({ message: "Thiếu categoryId" });

      const r = await CategoryDAO.updateCategory(String(categoryId), req.body || {});
      if (!r?.matchedCount) return res.status(404).json({ message: "Không tìm thấy danh mục" });

      const doc = await CategoryDAO.getCategoryById(String(categoryId));
      return res.json(doc || { ok: true });
    } catch (e) {
      if (e?.code === 11000) {
        return res.status(409).json({ message: "Danh mục đã tồn tại (trùng unique key)" });
      }
      console.error("❌ Category.update:", e);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  /** DELETE /categories/:categoryId */
  async remove(req, res) {
    try {
      const { categoryId } = req.params || {};
      if (!categoryId) return res.status(400).json({ message: "Thiếu categoryId" });

      try {
        const r = await CategoryDAO.deleteCategory(String(categoryId));
        if (!r?.deletedCount) return res.status(404).json({ message: "Không tìm thấy danh mục" });
        return res.json({ message: "Đã xoá", categoryId });
      } catch (err) {
        if (err?.code === "CATEGORY_IN_USE") {
          return res.status(409).json({
            message: "Không thể xoá do còn sách tham chiếu",
            code: "CATEGORY_IN_USE",
            bookCount: err.bookCount || 0,
          });
        }
        throw err;
      }
    } catch (e) {
      console.error("❌ Category.remove:", e);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },
};
