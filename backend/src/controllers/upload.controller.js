import { uploadBufferToCloudinary } from "../utils/uploadToCloudinary.js";

export async function uploadBookCoverController(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const r = await uploadBufferToCloudinary(req.file.buffer, { folder: "library/books" });
    return res.json({
      url: r.secure_url,
      public_id: r.public_id,
      width: r.width,
      height: r.height
    });
  } catch (e) {
    console.error("Upload error:", e);
    return res.status(500).json({ message: "Upload failed" });
  }
}
