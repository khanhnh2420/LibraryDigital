// src/controllers/category.controller.js
import { CategoryDAO } from "../DAO/category.DAO.js";

export const CategoryController = {
  // GET /api/categories?q=&limit=&page=&ids=CAT001,CAT002
  async list(req, res) {
    try {
      const { q, limit, page, ids } = req.query;
      const result = await CategoryDAO.list({
        q,
        limit,
        page,
        ids: ids ? String(ids).split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      return res.json(result);
    } catch (err) {
      console.error("list categories error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // GET /api/categories/:categoryId
  async getOne(req, res) {
    try {
      const { categoryId } = req.params;
      const doc = await CategoryDAO.getById(categoryId);
      if (!doc) return res.status(404).json({ message: "Không tìm thấy category" });
      return res.json(doc);
    } catch (err) {
      console.error("getOne category error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // POST /api/categories   (admin/librarian)
  async create(req, res) {
    try {
      const doc = await CategoryDAO.create(req.body || {});
      return res.status(201).json({ message: "Tạo category thành công", category: doc });
    } catch (err) {
      if (err.message === "NAME_REQUIRED") {
        return res.status(400).json({ message: "Tên category là bắt buộc" });
      }
      if (err.message === "CATEGORYID_TAKEN") {
        return res.status(409).json({ message: "Mã category đã tồn tại" });
      }
      console.error("create category error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // PUT /api/categories/:categoryId   (admin/librarian)
  async update(req, res) {
    try {
      const { categoryId } = req.params;
      const r = await CategoryDAO.update(categoryId, req.body || {});
      if (r.matchedCount === 0) return res.status(404).json({ message: "Không tìm thấy category" });
      return res.json({ message: "Cập nhật category thành công" });
    } catch (err) {
      console.error("update category error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // DELETE /api/categories/:categoryId   (admin/librarian)
  async remove(req, res) {
    try {
      const { categoryId } = req.params;
      const r = await CategoryDAO.remove(categoryId);
      if (r.deletedCount === 0) return res.status(404).json({ message: "Không tìm thấy category" });
      return res.json({ message: "Xoá category thành công" });
    } catch (err) {
      if (err.code === "IN_USE") {
        return res.status(409).json({ message: "Không thể xoá: Category đang được dùng bởi sách" });
      }
      console.error("remove category error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },

  // GET /api/categories/popular?limit=5
  async popular(req, res) {
    try {
      const limit = parseInt(req.query.limit ?? "5", 10);
      const items = await CategoryDAO.popular(limit);
      return res.json({ items, limit });
    } catch (err) {
      console.error("popular categories error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
  },
};
