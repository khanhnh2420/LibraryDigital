// src/utils/qr.js
import crypto from "crypto";

/** Tạo chuỗi token QR ngẫu nhiên (hex) */
export function genQrToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Tạo short code dạng AAAA-BBBB (A-Z0-9) */
export function genShortCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // bỏ O/0/I/1 cho dễ nhìn
  const part = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `${part()}-${part()}`;
}

/** SHA-256 -> hex */
export function sha256Hex(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}
