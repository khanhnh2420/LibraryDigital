import multer from "multer";

const mem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"].includes(file.mimetype);
    cb(ok ? null : new Error("Invalid image type"), ok);
  }
});

export const uploadImageMem = mem.single("file");     // cho /api/upload/book-cover
export const uploadCoverMem = mem.single("cover");    // cho POST /api/books nếu gộp
