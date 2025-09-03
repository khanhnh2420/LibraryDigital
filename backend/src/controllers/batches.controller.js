import { getDB } from "../config/db.js";

export async function listBatches(req, res) {
  const db = await getDB();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || "20", 10)));
  const match = {}; // có thể thêm filter status nếu cần: ?status=ChoNhan

  if (req.query.status) match.status = req.query.status;

  const [items, total] = await Promise.all([
    db.collection("loanBatches")
      .find(match, { projection: { qrTokenHash: 0, shortCodeHash: 0 } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    db.collection("loanBatches").countDocuments(match)
  ]);

  res.json({ items, page, pageSize, total });
}
