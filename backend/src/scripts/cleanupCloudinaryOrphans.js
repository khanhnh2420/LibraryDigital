// src/scripts/cleanupCloudinaryOrphans.js
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { connectDB, getDB, closeDB } from "../config/db.js";
import { derivePublicIdFromUrl } from "../utils/cloudinaryTools.js";

async function main() {
  await connectDB();
  const db = await getDB();

  // Lấy tất cả coverImage đang dùng
  const urls = await db.collection("books")
    .find({ coverImage: { $exists: true, $ne: null } }, { projection: { coverImage: 1, _id: 0 } })
    .toArray();

  const used = new Set(
    urls.map(x => derivePublicIdFromUrl(x.coverImage)).filter(Boolean)
  );

  // Liệt kê ảnh trong folder
  const folder = "library/books";
  let nextCursor = null;
  let orphans = [];

  do {
    const res = await cloudinary.api.resources({
      type: "upload",
      prefix: `${folder}/`,
      max_results: 500,
      next_cursor: nextCursor || undefined
    });

    for (const r of res.resources) {
      const pid = r.public_id; // e.g. "library/books/abc"
      if (!used.has(pid)) orphans.push(pid);
    }
    nextCursor = res.next_cursor;
  } while (nextCursor);

  console.log("Orphans:", orphans.length);
  if (orphans.length) {
    // Xóa theo lô (Cloudinary giới hạn ~100 public_ids/lần)
    const chunk = (arr, n) => arr.length ? [arr.slice(0, n), ...chunk(arr.slice(n), n)] : [];
    for (const group of chunk(orphans, 100)) {
      const r = await cloudinary.api.delete_resources(group);
      console.log("Deleted batch:", group.length, r);
    }
  }

  await closeDB();
}

main().catch(e => { console.error(e); process.exit(1); });
