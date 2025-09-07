// src/controllers/author.controller.js
import { AuthorDAO } from "../DAO/author.DAO.js";

export const AuthorController = {
  async list(req, res) {
    try {
      // dropdown: có limit nhưng không có page ⇒ simple
      if (req.query.limit && !req.query.page) {
        const { items } = await AuthorDAO.list({ q: req.query.q, limit: req.query.limit });
        return res.json({ items });
      }
      // admin list
      const data = await AuthorDAO.listPaged({
        page: req.query.page,
        pageSize: req.query.pageSize,
        q: req.query.q
      });
      return res.json(data);
    } catch (e) {
      console.error("❌ list authors:", e);
      return res.status(500).json({ message: "Server error" });
    }
  },

  async create(req, res) {
    try {
      const doc = await AuthorDAO.create(req.body);
      return res.status(201).json({ message: "Created", authorId: doc.authorId, author: doc });
    } catch (e) {
      if (String(e.message).startsWith("VALIDATION_ERROR::")) {
        return res.status(400).json({ message: e.message.replace("VALIDATION_ERROR::", "").trim() });
      }
      if (e?.code === 11000) return res.status(409).json({ message: "Duplicate authorId" });
      console.error("❌ create author:", e);
      return res.status(500).json({ message: "Server error" });
    }
  },

  async update(req, res) {
    try {
      const r = await AuthorDAO.update(req.params.authorId, req.body);
      if (r.matchedCount === 0) return res.status(404).json({ message: "Not found" });
      return res.json({ message: "Updated", modifiedCount: r.modifiedCount });
    } catch (e) {
      console.error("❌ update author:", e);
      return res.status(500).json({ message: "Server error" });
    }
  },

  async remove(req, res) {
    try {
      const r = await AuthorDAO.remove(req.params.authorId);
      if (r.deletedCount === 0) return res.status(404).json({ message: "Not found" });
      return res.json({ message: "Deleted" });
    } catch (e) {
      if (e?.code === "AUTHOR_IN_USE") {
        return res.status(409).json({ message: `Không thể xoá: tác giả đang được dùng bởi ${e.bookCount} sách` });
      }
      console.error("❌ delete author:", e);
      return res.status(500).json({ message: "Server error" });
    }
  }
};
