// src/controllers/book.controller.js
import { CategoryDAO } from "../DAO/category.DAO.js";

export const CategoryController = {

    async getAllCategories(req, res) {
        try {
            const categories = await CategoryDAO.getAllCategories();
            return res.status(200).json(categories);
        } catch (err) {
            console.error("❌ Lỗi getAll Category:", err);
            return res.status(500).json({ err });
        }
    },

    async list(req, res) {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50", 10)));
      const page = Math.max(1, parseInt(req.query.page || "1", 10));
      const q = (req.query.q || "").trim();
      const ids = req.query.ids ? String(req.query.ids).split(",").map(s => s.trim()).filter(Boolean) : [];

      const data = await CategoryDAO.list({ q, limit, page, ids });
      return res.json(data);
    } catch (e) {
      console.error("❌ categories.list:", e);
      return res.status(500).json({ message: "Lỗi server" });
    }
  }

};
