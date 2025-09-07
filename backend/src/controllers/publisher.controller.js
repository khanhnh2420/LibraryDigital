// src/controllers/publisher.controller.js
import { PublisherDAO } from "../DAO/publisher.DAO.js";

export const PublisherController = {
  async list(req, res) {
    try {
      if (req.query.limit && !req.query.page) {
        const { items } = await PublisherDAO.list({ q: req.query.q, limit: req.query.limit });
        return res.json({ items });
      }
      const data = await PublisherDAO.listPaged({
        page: req.query.page,
        pageSize: req.query.pageSize,
        q: req.query.q,
      });
      return res.json(data);
    } catch (e) {
      console.error("❌ list publishers:", e);
      return res.status(500).json({ message: "Server error" });
    }
  },

  async create(req, res) {
    try {
      const doc = await PublisherDAO.create(req.body);
      return res.status(201).json({ message: "Created", publisherId: doc.publisherId, publisher: doc });
    } catch (e) {
      if (String(e.message).startsWith("VALIDATION_ERROR::")) {
        return res.status(400).json({ message: e.message.replace("VALIDATION_ERROR::", "").trim() });
      }
      if (e?.code === 11000) return res.status(409).json({ message: "Duplicate publisherId" });
      console.error("❌ create publisher:", e);
      return res.status(500).json({ message: "Server error" });
    }
  },

  async update(req, res) {
    try {
      const r = await PublisherDAO.update(req.params.publisherId, req.body);
      if (r.matchedCount === 0) return res.status(404).json({ message: "Not found" });
      return res.json({ message: "Updated", modifiedCount: r.modifiedCount });
    } catch (e) {
      console.error("❌ update publisher:", e);
      return res.status(500).json({ message: "Server error" });
    }
  },

  async remove(req, res) {
    try {
      const r = await PublisherDAO.remove(req.params.publisherId);
      if (r.deletedCount === 0) return res.status(404).json({ message: "Not found" });
      return res.json({ message: "Deleted" });
    } catch (e) {
      if (e?.code === "PUBLISHER_IN_USE") {
        return res.status(409).json({ message: `Không thể xoá: NXB đang được dùng bởi ${e.bookCount} sách` });
      }
      console.error("❌ delete publisher:", e);
      return res.status(500).json({ message: "Server error" });
    }
  },
};
