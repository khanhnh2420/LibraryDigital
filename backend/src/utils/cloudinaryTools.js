// Nhận vào secure_url, trả về public_id (ví dụ: "library/books/mow7nzjrhkul4c5r33wx")
export function derivePublicIdFromUrl(url) {
  try {
    const u = new URL(url);
    // Ví dụ pathname: /<cloud_name>/image/upload/v1757007528/library/books/abc.png
    // hoặc có thể có transforms: /image/upload/c_scale,w_200/v1757.../library/books/abc.png
    const p = u.pathname;                   // e.g. "/dsuwqrt0b/image/upload/v1757.../library/books/abc.png"
    const marker = "/upload/";
    const i = p.indexOf(marker);
    if (i === -1) return null;
    let rest = p.slice(i + marker.length);  // "v1757.../library/books/abc.png" (hoặc "c_scale,w_200/v.../library/books/abc.png")

    // Bỏ phần transforms phía trước nếu có, giữ phần sau "v<digits>/..."
    const m = rest.match(/(?:[^/]+\/)*v\d+\/(.+)/); // bắt sau "v<digits>/"
    let asset = m ? m[1] : rest.replace(/^v\d+\//, ""); // fallback nếu không match

    // Bỏ query string nếu có
    asset = asset.split("?")[0];

    // Bỏ phần đuôi .ext (jpg, png, webp...)
    asset = asset.replace(/\.[^/.]+$/, "");

    // Decode URI (%20 -> space)
    return decodeURIComponent(asset);
  } catch {
    return null;
  }
}
