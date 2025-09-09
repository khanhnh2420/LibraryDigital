// Tiện ích tạo token/short code và băm SHA-256
import crypto from "crypto";

export function sha256Hex(str) {
  return crypto.createHash("sha256").update(String(str)).digest("hex");
}

export function randomHex(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex"); // mặc định 48 hex chars
}

export function genQrToken() {
  // 48 hex, đủ dài để quét QR an toàn
  return randomHex(24);
}

export function genShortCode() {
  // mã ngắn cho nhập tay tại quầy: XXXX-XXXX (hex upper)
  const s = randomHex(4).toUpperCase(); // 8 hex
  return `${s.slice(0, 4)}-${s.slice(4, 8)}`;
}
