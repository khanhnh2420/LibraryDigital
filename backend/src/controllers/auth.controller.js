import bcrypt from "bcryptjs";
import { UserModel } from "../models/user.model.js";

function generateUserId(role, username) {
    const prefix = role === "student" ? "SV" : role === "librarian" ? "GV" : "AD";
    return prefix + username;
}

export async function registerUser(req, res) {
    try {
        const { username, email, password, role } = req.body;

        // 1. Kiểm tra email đã tồn tại chưa
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: "Email đã được sử dụng" });
        }

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Lưu user mới
        // Clone template và gán dữ liệu
        const newUser = {
            ...UserModel.getTemplate(role),
            userId: generateUserId(role, username),
            username,
            passwordHash: hashedPassword,
            email,
        };

        const result = await UserModel.create(newUser);

        // 4. Trả response
        res.status(201).json({
            message: "Tạo tài khoản thành công",
            newUser
        });

    } catch (error) {
        console.error("❌ Lỗi khi tạo tài khoản:", error);
        res.status(500).json({ message: "Lỗi server" });
    }
}
