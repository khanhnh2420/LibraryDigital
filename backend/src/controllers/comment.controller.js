import { CommentDAO } from "../DAO/comment.DAO.js";
import { UsersDAO } from "../DAO/user.DAO.js";

// Helper: gắn user và ẩn userId khỏi response
function attachUser(doc, usersMap) {
  const u = usersMap[doc.userId] || { name: "Bạn đọc" };
  const { userId, ...rest } = doc;

  return { ...rest, user: u };
}

export const CommentController = {
  // Mặc định: trả threads + repliesPreview + hasMoreReplies + total/totalPages
  async listThreadsWithReplies(req, res) {
    try {
      const { bookId } = req.params;
      const page = parseInt(req.query.page || "1", 10);
      const limit = parseInt(req.query.limit || "10", 10);
      const repliesLimit = parseInt(req.query.repliesLimit || "2", 10);

      const { roots, total, totalPages } =
        await CommentDAO.getRootThreads({ bookId, page, limit });

      const parentIds = roots.map(r => r._id.toString());
      const repliesMap = await CommentDAO.getRepliesByParents({ parentIds, repliesLimit });

      // Gom tất cả userId từ roots + repliesPreview để query 1 lần
      const userIdSet = new Set();
      roots.forEach(r => r.userId && userIdSet.add(r.userId));
      Object.values(repliesMap).forEach(arr => {
        arr.forEach(rp => rp.userId && userIdSet.add(rp.userId));
      });

      const usersMap = await UsersDAO.getMapByUserIds(Array.from(userIdSet));

      // Hydrate user cho threads và repliesPreview
      const data = roots.map(r => {
        const repliesPreviewRaw = repliesMap[r._id.toString()] || [];
        const repliesPreview = repliesPreviewRaw.map(rp => attachUser(rp, usersMap));
        const hydrated = attachUser(r, usersMap);
        const hasMoreReplies = (r.repliesCount || 0) > repliesPreview.length;
        return { ...hydrated, repliesPreview, hasMoreReplies };
      });

      res.json({ data, page, limit, total, totalPages });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },

  // (Tuỳ chọn) chỉ threads — không kèm replies (vẫn hydrate user, ẩn userId)
  async listThreads(req, res) {
    try {
      const { bookId } = req.params;
      const page = parseInt(req.query.page || "1", 10);
      const limit = parseInt(req.query.limit || "10", 10);

      const result = await CommentDAO.getRootThreads({ bookId, page, limit });

      const userIdSet = new Set(result.roots.map(r => r.userId).filter(Boolean));
      const usersMap = await UsersDAO.getMapByUserIds(Array.from(userIdSet));

      const data = result.roots.map(r => attachUser(r, usersMap));

      res.json({
        data,
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },

  // Replies phân trang cho 1 thread (có offset) — hydrate user, ẩn userId
  async listReplies(req, res) {
    try {
      const { parentId } = req.params;
      const page = parseInt(req.query.page || "1", 10);
      const limit = parseInt(req.query.limit || "10", 10);
      const offset = parseInt(req.query.offset || "0", 10);

      const payload = await CommentDAO.getReplies({ parentId, page, limit, offset });

      const userIdSet = new Set(payload.data.map(r => r.userId).filter(Boolean));
      const usersMap = await UsersDAO.getMapByUserIds(Array.from(userIdSet));

      const data = payload.data.map(r => attachUser(r, usersMap));

      res.json({
        data,
        page: payload.page,
        limit: payload.limit,
        offset: payload.offset,
        total: payload.total,
        totalPages: payload.totalPages,
      });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },

  // Tạo comment gốc — trả về có user, ẩn userId
  async createRoot(req, res) {
    try {
      const { bookId, userId, content } = req.body;
      if (!bookId || !userId || !content) throw new Error("Missing fields");

      const created = await CommentDAO.createRoot({ bookId, userId, content });
      const usersMap = await UsersDAO.getMapByUserIds([userId]);
      const data = attachUser(created, usersMap);

      res.status(201).json(data);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },

  // Trả lời 1 comment — trả về có user, ẩn userId
  async createReply(req, res) {
    try {
      const { parentId } = req.params;
      const { userId, content } = req.body;
      if (!userId || !content) throw new Error("Missing fields");

      const created = await CommentDAO.createReply({ parentId, userId, content });
      const usersMap = await UsersDAO.getMapByUserIds([userId]);
      const data = attachUser(created, usersMap);

      res.status(201).json(data);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },

  async edit(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      if (!content) throw new Error("Missing content");

      const updated = await CommentDAO.edit({ id, content });
      const usersMap = await UsersDAO.getMapByUserIds([updated.userId].filter(Boolean));
      const data = attachUser(updated, usersMap);

      res.json(data);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },

  async softDelete(req, res) {
    try {
      const { id } = req.params;
      const ok = await CommentDAO.softDelete({ id });
      res.json({ success: ok });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },

  async toggleLike(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body; // "like" | "unlike"
      if (!["like", "unlike"].includes(action)) throw new Error("action invalid");
      const result = await CommentDAO.toggleLike({ id, action });
      res.json(result);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },
};
