import { getDB } from "../config/db.js";

export async function listLoans(req, res) {
  const db = await getDB();
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize || "20", 10)));
  const status = req.query.status; // optional

  const match = {};
  if (status === "active") match.status = { $in: ["ChoNhan","DangMuon","QuaHan"] };
  else if (status) match.status = status;

  const [items, total] = await Promise.all([
    db.collection("loans")
      .find(match, { projection: { note: 0 } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
    db.collection("loans").countDocuments(match)
  ]);

  res.json({ items, page, pageSize, total });
}
