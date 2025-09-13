import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const COMMENTS = "comments";

export const CommentDAO = {
  /**
   * Tạo comment gốc (thread) cho 1 sách.
   *
   * @param {Object} params
   * @param {string} params.bookId - Mã sách
   * @param {string} params.userId - Người tạo
   * @param {string} params.content - Nội dung comment
   *  @param {int} params.rating - Đánh giá
   * @returns {Promise<Object>} Document vừa tạo (kèm _id)
   */
  async createRoot({ bookId, userId, content, rating }) {
    const db = await getDB();
    const now = new Date();

    const doc = {
      bookId, userId, content, rating,
      parentId: null,
      likesCount: 0,
      repliesCount: 0,
      reportsCount: 0,
      status: "active",
      createdAt: now, updatedAt: now, editedAt: null,
    };
    const res = await db.collection(COMMENTS).insertOne(doc);
    return { _id: res.insertedId, ...doc };
  },

  /**
   * Tạo reply cho 1 comment cha.
   *
   * @param {Object} params
   * @param {string} params.parentId - _id (string) của comment cha
   * @param {string} params.userId
   * @param {string} params.content
   * @returns {Promise<Object>} Reply vừa tạo
   */
  async createReply({ parentId, userId, content }) {
    const db = await getDB();
    const parent = await db.collection(COMMENTS).findOne({
      _id: new ObjectId(parentId),
      status: { $ne: "deleted" },
    });
    if (!parent) throw new Error("Parent not found");

    const now = new Date();
    // Reply sẽ kế thừa bookId từ comment cha
    const reply = {
      bookId: parent.bookId,
      userId,
      parentId: parent._id, // liên kết đến comment cha
      content,
      rating: null,        // reply thường không có rating
      likesCount: 0,
      repliesCount: 0,    // nếu có trả lời lồng nhau thì mới dùng
      reportsCount: 0,
      status: "active",
      createdAt: now, updatedAt: now, editedAt: null,
    };

    // 1) insert reply
    await db.collection(COMMENTS).insertOne(reply);

    // 2) tăng repliesCount của comment cha (đếm tổng replies trực tiếp)
    await db.collection(COMMENTS).updateOne(
      { _id: parent._id },
      { $inc: { repliesCount: 1 } }
    );

    return reply;
  },

  /**
   * Lấy danh sách comment gốc (threads) theo phân trang.
   * Dùng skip/limit: page bắt đầu từ 1.
   *
   * @param {Object} params
   * @param {string} params.bookId
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @returns {Promise<{roots: Array, total: number, totalPages: number, page: number, limit: number}>}
   */
  async getRootThreads({ bookId, page = 1, limit = 10 }) {
    const db = await getDB();

    // Tính số bản ghi cần bỏ qua trước khi lấy trang hiện tại.
    // Ví dụ: page=1 -> skip=0; page=2 -> skip=limit; ...
    const skip = (Math.max(1, page) - 1) * limit;

    // Truy vấn các comment gốc:
    // - filter: đúng bookId, là comment gốc (parentId=null) và còn active
    // - sort: mới nhất trước (createdAt giảm dần)
    // - skip/limit: áp dụng phân trang theo công thức trên
    // - toArray(): thực thi cursor và trả mảng kết quả
    const roots = await db.collection(COMMENTS)
      .find({ bookId, parentId: null, status: "active" })  // 1) lọc
      .sort({ createdAt: -1 })                             // 2) sắp xếp mới → cũ
      .skip(skip)                                          // 3) bỏ qua N record đầu (offset)
      .limit(limit)                                        // 4) giới hạn số record trả về
      .toArray();                                          // 5) thực thi & lấy mảng kết quả

    // Đếm tổng số comment gốc để FE biết còn trang sau hay không
    const total = await db.collection(COMMENTS)
      .countDocuments({ bookId, parentId: null, status: "active" });

    // Tính tổng số trang để FE hiển thị nút "Tải thêm"
    const totalPages = Math.ceil(total / limit);

    return { roots, total, totalPages, page, limit };
  },

  /**
   * Lấy replies cho N parentId dưới dạng "preview", mỗi parent chỉ lấy tối đa repliesLimit reply mới nhất.
   * Dùng aggregation: $match → $sort → $group → $project $slice
   *
   * @param {Object} params
   * @param {string[]} params.parentIds - mảng _id (string) của các comment cha
   * @param {number} [params.repliesLimit=2] - số reply preview mỗi parent
   * @returns {Promise<Record<string, Array>>} map { parentIdString: replies[] }
   */
  async getRepliesByParents({ parentIds = [], repliesLimit = 2 }) {
    if (!parentIds.length) return {};
    const db = await getDB();

    // Aggregation pipeline:
    const pipeline = [
      {
        // 1) Chỉ lấy replies:
        //   - thuộc các parent trong `parentIds`
        //   - còn "active"
        $match: {
          parentId: { $in: parentIds.map(id => new ObjectId(id)) },
          status: "active",
        }
      },
      // 2) Sắp xếp tất cả replies theo thời gian tạo MỚI → CŨ
      //    Mục tiêu: để khi nhóm theo parentId, mảng replies được push theo đúng thứ tự này
      { $sort: { createdAt: -1 } },
      {
        // 3) Gom replies theo parentId
        //    - Mỗi nhóm (_id) là một parentId
        //    - $push vào mảng `replies` những trường cần trả về cho FE
        $group: {
          _id: "$parentId",
          replies: {
            $push: {
              _id: "$_id",
              userId: "$userId",
              content: "$content",
              likesCount: "$likesCount",
              repliesCount: "$repliesCount",
              createdAt: "$createdAt",
              updatedAt: "$updatedAt",
              rating: "$rating",
              status: "$status",
            }
          },
        }
      },
      // 4) Cắt mảng replies, chỉ giữ tối đa `repliesLimit` phần tử đầu (tức mới nhất)
      //    Vì đã sort desc trước khi group, phần tử đầu chính là các reply mới nhất
      { $project: { replies: { $slice: ["$replies", repliesLimit] } } },
    ];

    // 5) Chạy pipeline và chuyển về map { parentId: replies[] } để tiện tra cứu
    const grouped = await db.collection(COMMENTS).aggregate(pipeline).toArray();
    const map = {};
    for (const g of grouped) map[g._id.toString()] = g.replies;
    return map;
  },

  /**
   * Lấy replies của 1 parent theo phân trang + offset.
   * offset dùng để bỏ qua phần preview đã render sẵn, tránh trùng khi "Xem thêm trả lời".
   *
   * @param {Object} params
   * @param {string} params.parentId
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {number} [params.offset=0] - số replies cần bỏ qua đầu tiên (bằng repliesPreview.length)
   * @returns {Promise<{data: Array, page: number, limit: number, offset: number, total: number, totalPages: number}>}
   */
  async getReplies({ parentId, page = 1, limit = 10, offset = 0 }) {
    const db = await getDB();

    // Phân trang chuẩn + cộng thêm offset:
    //   baseSkip = (page - 1) * limit
    //   skip = offset + baseSkip
    const baseSkip = (Math.max(1, page) - 1) * limit;
    const safeOffset = Math.max(0, offset);
    const skip = safeOffset + baseSkip;

    // Lọc replies của đúng parent & "active"
    const filter = { parentId: new ObjectId(parentId), status: "active" };

    // Lấy data trang hiện tại: mới nhất → cũ nhất
    const data = await db.collection(COMMENTS)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Tổng replies thực tế (chưa trừ offset)
    const total = await db.collection(COMMENTS).countDocuments(filter);

    // Tổng trang sau khi bỏ qua offset
    const effectiveTotal = Math.max(0, total - safeOffset);
    const totalPages = effectiveTotal > 0 ? Math.ceil(effectiveTotal / limit) : 0;

    return { data, page, limit, offset: safeOffset, total, totalPages };
  },

  /**
   * Sửa nội dung 1 comment (xóa mềm thì không cho sửa).
   *
   * @param {Object} params
   * @param {string} params.id - _id comment
   * @param {string} params.content - nội dung mới
   * @returns {Promise<Object>} document sau khi update
   */
  async edit({ id, content }) {
    const db = await getDB();
    const res = await db.collection(COMMENTS).findOneAndUpdate(
      { _id: new ObjectId(id), status: { $ne: "deleted" } },      // không sửa nếu đã deleted
      { $set: { content, updatedAt: new Date(), editedAt: new Date() } },
      { returnDocument: "after" }                                 // trả về doc sau update
    );
    if (!res.value) throw new Error("Not found");
    return res.value;
  },

  /**
   * Xoá mềm 1 comment (status="deleted" + thay content).
   *
   * @param {Object} params
   * @param {string} params.id
   * @returns {Promise<boolean>} true nếu có doc được cập nhật
   */
  async softDelete({ id }) {
    const db = await getDB();
    const res = await db.collection(COMMENTS).updateOne(
      { _id: new ObjectId(id), status: { $ne: "deleted" } },      // chỉ xóa nếu chưa deleted
      { $set: { status: "deleted", content: "[đã xóa]", updatedAt: new Date(), editedAt: new Date() } }
    );
    return res.modifiedCount === 1;
  },

  /**
   * Tăng/giảm likesCount.
   *
   * @param {Object} params
   * @param {string} params.id
   * @param {"like"|"unlike"} params.action
   * @returns {Promise<{likesCount: number}>}
   */
  async toggleLike({ id, action }) {
    const db = await getDB();
    const inc = action === "like" ? 1 : -1;     // like -> +1, unlike -> -1

    const res = await db.collection(COMMENTS).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $inc: { likesCount: inc } },            // tăng/giảm likesCount
      { returnDocument: "after" }
    );
    if (!res.value) throw new Error("Not found");
    return { likesCount: res.value.likesCount };
  },
};
