// src/jobs/expireHolds.js
import { getDB } from "../config/db.js";
import { LoanStatus, BatchStatus } from "../constants/loanStatus.js";
import { BookDAO } from "../DAO/book.DAO.js";

export async function expireHolds() {
  const db = await getDB();
  const now = new Date();

  const cursor = db.collection("loanBatches").find(
    { status: BatchStatus.ChoNhan, expiresAt: { $lte: now } },
    { projection: { _id: 1 } }
  );

  while (await cursor.hasNext()) {
    const b = await cursor.next();
    const session = db.client.startSession();
    try {
      await session.withTransaction(async () => {
        const loans = await db.collection("loans")
          .find({ batchId: b._id, status: LoanStatus.ChoNhan }, { session })
          .project({ bookId: 1 })
          .toArray();

        for (const l of loans) {
          await BookDAO.incAvailable(l.bookId, session);
        }

        await db.collection("loans").updateMany(
          { batchId: b._id, status: LoanStatus.ChoNhan },
          { $set: { status: LoanStatus.Huy } },
          { session }
        );

        await db.collection("loanBatches").updateOne(
          { _id: b._id },
          { $set: { status: BatchStatus.Huy } },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }
  }
}
