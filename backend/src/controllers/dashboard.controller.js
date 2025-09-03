import { getDB } from "../config/db.js";

export async function dashboardSummary(_req, res) {
  const db = await getDB();
  const now = new Date();
  const days14 = new Date(now.getTime() - 14*24*60*60*1000);
  const days30 = new Date(now.getTime() - 30*24*60*60*1000);

  // Thẻ số
  const [booksCount, usersCount] = await Promise.all([
    db.collection("books").countDocuments(),
    db.collection("users").countDocuments()
  ]);
  const [activeAgg] = await db.collection("loans").aggregate([
    { $match: { status: { $in: ["ChoNhan","DangMuon","QuaHan"] } } },
    { $group: { _id: null, count: { $sum: 1 } } }
  ]).toArray();
  const activeLoans = activeAgg?.count ?? 0;

  // Overdue (tính động theo dueDate)
  const overdue = await db.collection("loans").countDocuments({
    status: { $in: ["DangMuon","QuaHan"] },
    dueDate: { $lt: now }
  });

  // Low stock (tối đa 5 cuốn)
  const lowStock = await db.collection("books")
    .find({ available: { $lte: 3 } }, { projection: { _id:0, bookId:1, title:1, available:1 } })
    .sort({ available: 1 })
    .limit(5)
    .toArray();

  // Recent loans (8 bản ghi mới nhất)
  const recentRaw = await db.collection("loans").aggregate([
    { $sort: { createdAt: -1 } }, { $limit: 8 },
    { $lookup: { from: "users", localField: "userId", foreignField: "userId", as: "user" } },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "books", localField: "bookId", foreignField: "bookId", as: "book" } },
    { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },
    { $project: {
        _id:1, status:1, dueDate:1,
        userName: { $ifNull: ["$user.name", { $ifNull: ["$user.username","$user.userId"] }] },
        bookTitle: { $ifNull: ["$book.title", "$book.bookId"] }
    } }
  ]).toArray();
  const recentLoans = recentRaw.map(l => ({
    id: l._id?.toString(),
    userName: l.userName || "-",
    bookTitle: l.bookTitle || "-",
    dueDate: l.dueDate instanceof Date ? l.dueDate.toISOString() : l.dueDate ?? null,
    status: l.status || "-"
  }));

  // Loans trend 14 ngày (group theo yyyy-mm-dd)
  const loansTrend = await db.collection("loans").aggregate([
    { $match: { createdAt: { $gte: days14 } } },
    { $group: {
        _id: { $dateToString: { date: "$createdAt", format: "%Y-%m-%d" } },
        count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]).toArray();

  // Top books 30 ngày
  const topBooks = await db.collection("loans").aggregate([
    { $match: { createdAt: { $gte: days30 } } },
    { $group: { _id: "$bookId", total: { $sum: 1 } } },
    { $sort: { total: -1 } }, { $limit: 5 },
    { $lookup: { from: "books", localField: "_id", foreignField: "bookId", as: "book" } },
    { $unwind: { path: "$book", preserveNullAndEmptyArrays: true } },
    { $project: { bookId: "$_id", total:1, title: "$book.title", coverImage:"$book.coverImage", _id:0 } }
  ]).toArray();

  // Top categories 30 ngày
  const topCategories = await db.collection("loans").aggregate([
    { $match: { createdAt: { $gte: days30 } } },
    { $lookup: { from: "books", localField: "bookId", foreignField: "bookId", as: "book" } },
    { $unwind: "$book" },
    { $group: { _id: "$book.categoryId", total: { $sum: 1 } } },
    { $sort: { total: -1 } }, { $limit: 5 },
    { $lookup: { from: "categories", localField: "_id", foreignField: "categoryId", as: "cat" } },
    { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
    { $project: { categoryId: "$_id", total:1, name: { $ifNull: ["$cat.name","$_id"] }, _id:0 } }
  ]).toArray();

  // Batch conversion rate 30 ngày
  const [batchAgg] = await db.collection("loanBatches").aggregate([
    { $match: { createdAt: { $gte: days30 } } },
    { $group: {
      _id: "$status", c: { $sum: 1 }
    } }
  ]).toArray();
  // Convert nhỏ gọn:
  const byStatus = (await db.collection("loanBatches").aggregate([
    { $match: { createdAt: { $gte: days30 } } },
    { $group: { _id: "$status", c: { $sum: 1 } } }
  ]).toArray()).reduce((m, x) => (m[x._id] = x.c, m), {});
  const totalBatches = (byStatus.ChoNhan||0) + (byStatus.DangMuon||0) + (byStatus.Huy||0);
  const conversionRate = totalBatches ? Math.round(((byStatus.DangMuon||0) / totalBatches) * 100) : 0;

  // Near-expire batches (12h tới)
  const nearExpireBatches = await db.collection("loanBatches").countDocuments({
    status: "ChoNhan",
    expiresAt: { $lt: new Date(now.getTime() + 12*60*60*1000) }
  });

  res.json({
    books: booksCount,
    users: usersCount,
    activeLoans,
    overdue,
    recentLoans,
    loansTrend,        // [{ _id: "2025-09-01", count: 23 }, ...]
    topBooks,          // [{ bookId, title, total, coverImage }]
    topCategories,     // [{ categoryId, name, total }]
    lowStock,          // [{ bookId, title, available }]
    conversionRate,    // %
    nearExpireBatches
  });
}
