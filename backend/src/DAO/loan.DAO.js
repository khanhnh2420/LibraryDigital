import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { sha256Hex, genQrToken, genShortCode } from "../utils/crypto.js";

const HOLD_TTL_MINUTES = Number(process.env.HOLD_TTL_MINUTES ?? 24 * 60); // 24h
const LOAN_DAYS = Number(process.env.LOAN_DAYS ?? 14);

const STATUS = {
  HOLD: "ChoNhan",
  ACTIVE: "DangMuon",
  RETURNED: "DaTra",
  CANCELED: "Huy",
};

function addDays(d, n) {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

export const LoanDAO = {
  /**
   * Tạo batch giữ chỗ 24h + trừ tồn ngay lập tức (đặt chỗ)
   * items: [{ bookId, qty }]
   * Trả về: { batchId, loanIds, expiresAt, qrToken, shortCode }
   */
  async createHoldBatch({ userId, items = [] }) {
    if (!userId || !Array.isArray(items) || items.length === 0) {
      throw new Error("INVALID_INPUT");
    }

    // Chuẩn hóa items: gộp theo bookId, qty >= 1
    const map = new Map();
    for (const it of items) {
      const bid = String(it.bookId).trim();
      const q = Math.max(1, Number(it.qty || 1));
      if (!bid) continue;
      map.set(bid, (map.get(bid) || 0) + q);
    }
    const normItems = Array.from(map.entries()).map(([bookId, qty]) => ({ bookId, qty }));
    if (normItems.length === 0) throw new Error("INVALID_INPUT");

    const db = await getDB();
    const session = db.client.startSession();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + HOLD_TTL_MINUTES * 60 * 1000);

    // chuẩn bị token/short code (lưu hash vào DB)
    const qrToken = genQrToken();
    const shortCode = genShortCode();

    const batchId = new ObjectId();
    const loanDocs = [];

    try {
      await session.withTransaction(async () => {
        // 1) Trừ tồn từng đầu sách (điều kiện available >= qty)
        for (const { bookId, qty } of normItems) {
          const r = await db.collection("books").updateOne(
            { bookId, available: { $gte: qty } },
            { $inc: { available: -qty }, $set: { updatedAt: now } },
            { session }
          );
          if (r.modifiedCount !== 1) {
            // Không đủ tồn → rollback
            throw new Error(`INSUFFICIENT_STOCK:${bookId}`);
          }
        }

        // 2) Tạo batch
        const batchDoc = {
          _id: batchId,
          userId,
          status: STATUS.HOLD,
          createdAt: now,
          updatedAt: now,
          receivedAt: null,
          expiresAt,        // giữ chỗ đến thời điểm này
          qrTokenHash: sha256Hex(qrToken),
          qrExpiresAt: expiresAt,           // QR chỉ hợp lệ trong thời gian giữ chỗ
          shortCodeHash: sha256Hex(shortCode),
          attempts: 0,
          lockedUntil: null,
        };
        await db.collection("loanBatches").insertOne(batchDoc, { session });

        // 3) Tạo các loan cho từng cuốn (mỗi qty → 1 loan)
        for (const { bookId, qty } of normItems) {
          for (let i = 0; i < qty; i++) {
            loanDocs.push({
              userId,
              bookId,
              status: STATUS.HOLD,
              createdAt: now,
              updatedAt: now,
              dueDate: null,
              returnedAt: null,
              note: null,
              batchId,
            });
          }
        }
        const ins = await db.collection("loans").insertMany(loanDocs, { session });
        // (tuỳ bạn có muốn lưu loanIds trong batch hay không)
        await db.collection("loanBatches").updateOne(
          { _id: batchId },
          { $set: { loanIds: Object.values(ins.insertedIds) } },
          { session }
        );
      });

      const out = {
        batchId: String(batchId),
        loanIds: loanDocs.map((_, idx) => String(new ObjectId())),
        expiresAt,
      };
      // Trả token cho mobile để hiển thị QR (nhưng chỉ lưu hash ở DB)
      if (process.env.NODE_ENV !== "production") {
        out.qrToken = qrToken;
        out.shortCode = shortCode;
      } else {
        out.qrToken = qrToken;
        out.shortCode = shortCode;
      }
      return out;
    } finally {
      await session.endSession();
    }
  },

  /**
   * Xác nhận bằng QR tại quầy (staff)
   * body: { qrToken }
   */
  async confirmByQrToken({ qrToken, confirmerId }) {
    if (!qrToken) throw new Error("QR_REQUIRED");
    const db = await getDB();
    const session = db.client.startSession();
    const now = new Date();
    const qrHash = sha256Hex(qrToken);

    try {
      return await session.withTransaction(async () => {
        const batch = await db.collection("loanBatches").findOne(
          { qrTokenHash: qrHash, status: STATUS.HOLD },
          { session }
        );
        if (!batch) throw new Error("QR_INVALID_OR_EXPIRED");
        if (batch.qrExpiresAt && batch.qrExpiresAt <= now) {
          throw new Error("QR_EXPIRED");
        }

        const due = addDays(now, LOAN_DAYS);

        // Cập nhật loans từ HOLD → ACTIVE
        const updLoans = await db.collection("loans").updateMany(
          { batchId: batch._id, status: STATUS.HOLD },
          { $set: { status: STATUS.ACTIVE, updatedAt: now, dueDate: due, confirmerId } },
          { session }
        );

        if (updLoans.modifiedCount === 0) {
          // Có thể đã confirm rồi hoặc bị hủy
          throw new Error("NO_LOANS_TO_CONFIRM");
        }

        // Cập nhật batch
        await db.collection("loanBatches").updateOne(
          { _id: batch._id },
          { $set: { status: STATUS.ACTIVE, receivedAt: now, updatedAt: now, confirmerId } },
          { session }
        );

        return {
          batchId: String(batch._id),
          confirmed: updLoans.modifiedCount,
          dueDate: due,
        };
      });
    } finally {
      await session.endSession();
    }
  },

  /**
   * Hủy batch (admin/staff) → hoàn tồn cho sách còn ở trạng thái HOLD
   */
  async cancelBatch(batchId, reason = "cancelled_by_staff") {
    const db = await getDB();
    const session = db.client.startSession();
    const _id = new ObjectId(batchId);
    const now = new Date();

    try {
      await session.withTransaction(async () => {
        const batch = await db.collection("loanBatches").findOne({ _id }, { session });
        if (!batch) throw new Error("BATCH_NOT_FOUND");
        if (batch.status !== STATUS.HOLD) throw new Error("BATCH_NOT_HOLD");

        // Lấy các loan còn HOLD
        const loans = await db.collection("loans")
          .find({ batchId: _id, status: STATUS.HOLD }, { session })
          .toArray();

        if (loans.length > 0) {
          // Gom theo bookId → hoàn tồn
          const countByBook = new Map();
          for (const l of loans) {
            countByBook.set(l.bookId, (countByBook.get(l.bookId) || 0) + 1);
          }
          for (const [bookId, cnt] of countByBook.entries()) {
            await db.collection("books").updateOne(
              { bookId },
              { $inc: { available: cnt }, $set: { updatedAt: now } },
              { session }
            );
          }

          // Update loans → Huy
          await db.collection("loans").updateMany(
            { batchId: _id, status: STATUS.HOLD },
            { $set: { status: STATUS.CANCELED, updatedAt: now, cancelReason: reason } },
            { session }
          );
        }

        // Update batch → Huy
        await db.collection("loanBatches").updateOne(
          { _id },
          { $set: { status: STATUS.CANCELED, updatedAt: now, cancelReason: reason } },
          { session }
        );
      });

      return { ok: true };
    } finally {
      await session.endSession();
    }
  },

  /**
   * List batches (admin)
   */
  async listBatches({ page = 1, pageSize = 10, status, q = "" } = {}) {
    const db = await getDB();
    const col = db.collection("loanBatches");
    page = Math.max(1, parseInt(page, 10) || 1);
    pageSize = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 10));
    const match = {};
    if (status) match.status = status;
    if (q?.trim()) match.userId = { $regex: q.trim(), $options: "i" };

    const total = await col.countDocuments(match);
    const items = await col
      .aggregate([
        { $match: match },
        { $sort: { createdAt: -1, _id: -1 } },
        { $skip: (page - 1) * pageSize },
        { $limit: pageSize },
        {
          $lookup: {
            from: "loans",
            localField: "_id",
            foreignField: "batchId",
            as: "loans",
          },
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            status: 1,
            createdAt: 1,
            expiresAt: 1,
            receivedAt: 1,
            totalLoans: { $size: "$loans" },
          },
        },
      ])
      .toArray();

    return {
      items: items.map((b) => ({ ...b, batchId: String(b._id) })),
      total,
      page,
      pageSize,
    };
  },
};
