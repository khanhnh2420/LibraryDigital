import { v2 as cloudinary } from "cloudinary";
import "../config/cloudinary.js"; // đảm bảo config đã load

export async function deleteCloudinaryByPublicId(publicId) {
  if (!publicId) return { skipped: true };
  try {
    const r = await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
    // r: { result: "ok" | "not found" | "error" ... }
    return r;
  } catch (e) {
    console.error("Cloudinary destroy error:", e);
    throw e;
  }
}
