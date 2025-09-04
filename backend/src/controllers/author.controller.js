import { AuthorDAO } from "../DAO/author.DAO.js";

export const AuthorController = {
  async list(req, res) {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "50", 10)));
      const page = Math.max(1, parseInt(req.query.page || "1", 10));
      const q = (req.query.q || "").trim();
      const ids = req.query.ids ? String(req.query.ids).split(",").map(s => s.trim()).filter(Boolean) : [];

      const data = await AuthorDAO.list({ q, limit, page, ids });
      return res.json(data);
    } catch (e) {
      console.error("❌ authors.list:", e);
      return res.status(500).json({ message: "Lỗi server" });
    }
  }
};
