// Cron hủy hold quá hạn & hoàn tồn
import { getDB } from "../config/db.js";

const STATUS = {
  HOLD: "ChoNhan",
  CANCELED: "Huy",
};

export async function expireHoldsOnce() {
  const db = await getDB();
  const now = new Date();

  const cursor = db.collection("loanBatches").find(
    { status: STATUS.HOLD, expiresAt: { $lte: now } },
    { projection: { _id: 1 } }
  );

  while (await cursor.hasNext()) {
    const b = await cursor.next();
    const session = db.client.startSession();
    try {
      await session.withTransaction(async () => {
        const loans = await db.collection("loans")
          .find({ batchId: b._id, status: STATUS.HOLD }, { session })
          .toArray();

        if (loans.length > 0) {
          // cộng trả tồn cho các bookId còn HOLD
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

          // chuyển loans → Huy
          await db.collection("loans").updateMany(
            { batchId: b._id, status: STATUS.HOLD },
            { $set: { status: STATUS.CANCELED, updatedAt: now, cancelReason: "expired" } },
            { session }
          );
        }

        // batch → Huy
        await db.collection("loanBatches").updateOne(
          { _id: b._id },
          { $set: { status: STATUS.CANCELED, updatedAt: now, cancelReason: "expired" } },
          { session }
        );
      });
    } catch (e) {
      console.error("expireHoldsOnce batch error:", e);
    } finally {
      await session.endSession();
    }
  }
}

// gọi mỗi 10 phút
export function scheduleExpireHolds() {
  const INTERVAL_MS = 10 * 60 * 1000;
  setInterval(() => {
    expireHoldsOnce().catch((e) => console.error("expireHoldsOnce error:", e));
  }, INTERVAL_MS);
}
