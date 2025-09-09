// src/DAO/LoanBatch.DAO.js
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";
import { BatchStatus } from "../constants/loanStatus.js";

const BATCHES = "loanBatches";

export const LoanBatchDAO = {
  async create({ userId, loanIds, qrTokenHash, shortCodeHash, expiresAt }, session) {
    const db = await getDB();
    const now = new Date();
    const doc = {
      userId,
      loanIds,
      status: BatchStatus.ChoNhan,
      createdAt: now,
      expiresAt,
      receivedAt: null,
      qrTokenHash,
      qrExpiresAt: expiresAt,
      shortCodeHash,
      attempts: 0,
      lockedUntil: null,
    };
    const res = await db.collection(BATCHES).insertOne(doc, { session });
    return res.insertedId;
  },

  async setStatus(batchId, toStatus, session) {
    const db = await getDB();
    await db.collection(BATCHES).updateOne(
      { _id: new ObjectId(batchId) },
      { $set: { status: toStatus } },
      { session }
    );
  },

  async setReceived(batchId, receivedAt, session) {
    const db = await getDB();
    await db.collection(BATCHES).updateOne(
      { _id: new ObjectId(batchId) },
      { $set: { status: BatchStatus.DangMuon, receivedAt } },
      { session }
    );
  },
};
