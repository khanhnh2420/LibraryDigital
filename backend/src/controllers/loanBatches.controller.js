// src/controllers/loanBatches.controller.js
import { getDB } from "../config/db.js";
import { generateQrToken, generateShortCode, sha256Hex, verifyWithSha256 } from "../utils/pickupCode.js";

export async function createBatchFromLoans(req, res) {
    try {
        const userId = req.user?.userId;
        const { loanIds, holdHours = 48 } = req.body || {};
        if (!userId || !Array.isArray(loanIds) || loanIds.length === 0) {
            return res.status(400).json({ message: "Thiếu userId/loanIds" });
        }

        const db = await getDB();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + holdHours * 3600 * 1000);

        const batchId = "B" + Date.now(); // hoặc counter

        // sinh mã
        const qrToken = generateQrToken();
        const shortCode = generateShortCode();

        const doc = {
            batchId,
            userId,
            loanIds: loanIds.map((id) => new db.bson.ObjectId(String(id))),
            status: "ChoNhan",
            createdAt: now,
            expiresAt,
            receivedAt: null,
            qrTokenHash: sha256Hex(qrToken),
            qrExpiresAt: expiresAt,
            shortCodeHash: sha256Hex(shortCode),
            attempts: 0,
            lockedUntil: null
        };

        // Gắn batchId vào các loan (đã tạo sẵn) & để status "ChoNhan"
        const session = db.client.startSession();
        try {
            await session.withTransaction(async () => {
                await db.collection("loanBatches").insertOne(doc, { session });
                await db.collection("loans").updateMany(
                    { _id: { $in: doc.loanIds }, userId, status: "ChoNhan" },
                    { $set: { batchId, updatedAt: now } },
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }

        // Trả raw code cho app (chỉ lần này)
        return res.json({
            batchId,
            qrToken,
            shortCode,
            qrExpiresAt: doc.qrExpiresAt,
            expiresAt: doc.expiresAt
        });
    } catch (e) {
        console.error("createBatchFromLoans error:", e);
        return res.status(500).json({ message: "Tạo phiếu mượn thất bại" });
    }
}

export async function confirmByQr(req, res) {
    try {
        const { batchId } = req.params;
        const { qrToken } = req.body || {};
        if (!qrToken) return res.status(400).json({ message: "Thiếu qrToken" });

        const db = await getDB();
        const batch = await db.collection("loanBatches").findOne({ batchId });
        if (!batch) return res.status(404).json({ message: "Không tìm thấy phiếu" });
        if (batch.status !== "ChoNhan") return res.status(409).json({ message: "Trạng thái không hợp lệ" });

        const now = new Date();
        if (batch.lockedUntil && now < batch.lockedUntil) {
            return res.status(429).json({ message: "Phiếu đang bị khoá tạm thời do nhập sai nhiều lần" });
        }
        if ((batch.qrExpiresAt && now > batch.qrExpiresAt) || (batch.expiresAt && now > batch.expiresAt)) {
            return res.status(409).json({ message: "Mã đã hết hạn" });
        }

        // verify
        const ok = verifyWithSha256(qrToken, batch.qrTokenHash);
        if (!ok) {
            const attempts = (batch.attempts || 0) + 1;
            const update = { attempts, updatedAt: now };
            if (attempts >= 5) update.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15m
            await db.collection("loanBatches").updateOne({ batchId }, { $set: update });
            return res.status(401).json({ message: "Mã QR không đúng" });
        }

        // Success → transaction: chuyển DangMuon
        const session = db.client.startSession();
        try {
            await session.withTransaction(async () => {
                await db.collection("loans").updateMany(
                    { batchId, status: "ChoNhan" },
                    { $set: { status: "DangMuon", borrowedAt: now, updatedAt: now } },
                    { session }
                );
                await db.collection("loanBatches").updateOne(
                    { batchId },
                    { $set: { status: "DangMuon", receivedAt: now, attempts: 0, lockedUntil: null, updatedAt: now } },
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }

        return res.json({ message: "Xác nhận mượn (QR) thành công" });
    } catch (e) {
        console.error("confirmByQr error:", e);
        return res.status(500).json({ message: "Xác nhận thất bại" });
    }
}
export async function confirmByShortCode(req, res) {
    try {
        const { batchId } = req.params;
        const { shortCode } = req.body || {};
        if (!shortCode) return res.status(400).json({ message: "Thiếu shortCode" });

        const db = await getDB();
        const batch = await db.collection("loanBatches").findOne({ batchId });
        if (!batch) return res.status(404).json({ message: "Không tìm thấy phiếu" });
        if (batch.status !== "ChoNhan") return res.status(409).json({ message: "Trạng thái không hợp lệ" });

        const now = new Date();
        if (batch.lockedUntil && now < batch.lockedUntil) {
            return res.status(429).json({ message: "Phiếu bị khoá tạm thời" });
        }
        if ((batch.qrExpiresAt && now > batch.qrExpiresAt) || (batch.expiresAt && now > batch.expiresAt)) {
            return res.status(409).json({ message: "Mã đã hết hạn" });
        }

        const ok = verifyWithSha256(shortCode, batch.shortCodeHash);
        if (!ok) {
            const attempts = (batch.attempts || 0) + 1;
            const update = { attempts, updatedAt: now };
            if (attempts >= 5) update.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
            await db.collection("loanBatches").updateOne({ batchId }, { $set: update });
            return res.status(401).json({ message: "Mã không đúng" });
        }

        const session = db.client.startSession();
        try {
            await session.withTransaction(async () => {
                await db.collection("loans").updateMany(
                    { batchId, status: "ChoNhan" },
                    { $set: { status: "DangMuon", borrowedAt: now, updatedAt: now } },
                    { session }
                );
                await db.collection("loanBatches").updateOne(
                    { batchId },
                    { $set: { status: "DangMuon", receivedAt: now, attempts: 0, lockedUntil: null, updatedAt: now } },
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }
        return res.json({ message: "Xác nhận mượn (Code) thành công" });
    } catch (e) {
        console.error("confirmByShortCode error:", e);
        return res.status(500).json({ message: "Xác nhận thất bại" });
    }
}
export async function regenerateCodes(req, res) {
    try {
        const { batchId } = req.params;
        const db = await getDB();
        const batch = await db.collection("loanBatches").findOne({ batchId, status: "ChoNhan" });
        if (!batch) return res.status(404).json({ message: "Không tìm thấy hoặc trạng thái không hợp lệ" });

        const now = new Date();
        const ttlMinutes = Number(req.body?.ttlMinutes || 60); // mặc định 60 phút
        const newExpire = new Date(now.getTime() + ttlMinutes * 60 * 1000);

        const qrToken = generateQrToken();
        const shortCode = generateShortCode();

        await db.collection("loanBatches").updateOne(
            { batchId },
            {
                $set: {
                    qrTokenHash: sha256Hex(qrToken),
                    qrExpiresAt: newExpire,
                    shortCodeHash: sha256Hex(shortCode),
                    attempts: 0,
                    lockedUntil: null,
                    updatedAt: now
                }
            }
        );

        // Trả raw về để app/nhân viên in/trưng
        return res.json({ batchId, qrToken, shortCode, qrExpiresAt: newExpire });
    } catch (e) {
        console.error("regenerateCodes error:", e);
        return res.status(500).json({ message: "Không tạo lại mã được" });
    }
}


