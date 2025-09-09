import { useEffect, useMemo, useRef, useState } from "react";
import { App as AntdApp, Modal, Form, Input, Select, Button, Space } from "antd";
import {
  useCreateUserMutation,
  useUpdateUserMutation
} from "@/services/usersApi";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "librarian", label: "Librarian" },
  { value: "student", label: "Student" },
];

function rolePrefix(role) {
  const r = String(role || "").toLowerCase();
  if (r === "student") return "SV";
  if (r === "admin") return "AD";
  if (r === "librarian" || r === "teacher") return "GV";
  return "SV";
}

function genPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function UpsertUserModal({ open, onClose, init }) {
  const isEdit = !!init?.userId;
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();

  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();

  // để biết có auto-gen password hay không (để hiển thị sau khi tạo)
  const autoPwdRef = useRef(null);

  // Khi mở modal, set default
  useEffect(() => {
    if (open) {
      if (isEdit) {
        form.setFieldsValue({
          ...init,
          // tách idNumber từ userId nếu muốn hiển thị (bỏ phần prefix chữ)
          idNumber: init.userId ? String(init.userId).replace(/^\D+/g, "") : ""
        });
      } else {
        form.setFieldsValue({
          role: "student",
          status: "active",
          borrowLimit: 5,
          idNumber: "",
          userId: "",
          username: "",
          password: ""
        });
      }
    } else {
      form.resetFields();
      autoPwdRef.current = null;
    }
  }, [open, isEdit, init, form]);

  // Theo dõi role + idNumber để tính userId & mặc định username
  const role = Form.useWatch("role", form);
  const idNumber = Form.useWatch("idNumber", form);

  useEffect(() => {
    if (isEdit) return; // không động vào khi edit

    const prefix = rolePrefix(role);
    const digits = String(idNumber || "").replace(/\D+/g, "");
    const userId = digits ? `${prefix}${digits}` : "";
    const currentUsername = form.getFieldValue("username");

    form.setFieldsValue({
      userId,
      // nếu username đang rỗng hoặc đang đúng bằng lower(userId) trước đó thì cập nhật
      username: !currentUsername || currentUsername === currentUsername.toLowerCase()
        ? (userId ? userId.toLowerCase() : "")
        : currentUsername
    });

    // set default borrowLimit theo role khi tạo mới
    const bl = role === "student" ? 5 : 10;
    form.setFieldsValue({ borrowLimit: bl });
  }, [role, idNumber, isEdit, form]);

  const isStudent = useMemo(() => String(role || "").toLowerCase() === "student", [role]);

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };

      // Chuẩn hoá tạo mới
      if (!isEdit) {
        // bắt buộc userId/username theo tính toán FE
        if (!payload.userId) {
          message.error("Vui lòng nhập mã số để tạo userId");
          return;
        }
        if (!payload.username) {
          payload.username = payload.userId.toLowerCase();
        }

        // nếu không nhập password ⇒ tự sinh
        if (!payload.password) {
          const pwd = genPassword();
          payload.password = pwd;
          autoPwdRef.current = pwd;
        }
      } else {
        // edit: không cho gửi các field không cần thiết
        delete payload.idNumber;
        delete payload.password; // đổi mật khẩu làm ở chức năng riêng
        delete payload.userId;   // không đổi userId khi edit
      }

      // ép kiểu số
      if (payload.borrowLimit != null) payload.borrowLimit = Number(payload.borrowLimit);
      if (payload.year != null && payload.year !== "") payload.year = Number(payload.year);

      if (isEdit) {
        await updateUser({ userId: init.userId, data: payload }).unwrap();
        message.success("Updated user");
      } else {
        await createUser(payload).unwrap();
        if (autoPwdRef.current) {
          message.success(`Created. Initial password: ${autoPwdRef.current}`);
        } else {
          message.success("Created");
        }
      }

      onClose?.(true);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.data?.message || "Save failed");
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit User" : "Add User"}
      open={open}
      onCancel={() => onClose?.(false)}
      onOk={onSubmit}
      okButtonProps={{ loading: creating || updating }}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        {/* Role trước vì ảnh hưởng userId/borrowLimit */}
        <Form.Item
          name="role"
          label="Role"
          rules={[{ required: true, message: "Role is required" }]}
        >
          <Select options={ROLE_OPTIONS} disabled={isEdit} />
        </Form.Item>

        {!isEdit && (
          <>
            <Form.Item
              name="idNumber"
              label="ID Number"
              rules={[
                { required: true, message: "ID Number is required" },
                {
                  validator: (_, v) => {
                    if (!v) return Promise.resolve();
                    const digits = String(v).replace(/\D+/g, "");
                    if (!digits) return Promise.reject("Chỉ nhập chữ số");
                    if (digits.length < 4) return Promise.reject("Tối thiểu 4 chữ số");
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input
                placeholder="VD: 24550022"
                onChange={(e) => {
                  const raw = e.target.value || "";
                  // Cho nhập tự do nhưng sẽ strip khi tính userId
                  form.setFieldsValue({ idNumber: raw });
                }}
              />
            </Form.Item>

            <Form.Item label="User ID (auto)" name="userId">
              <Input disabled />
            </Form.Item>
          </>
        )}

        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: "Username is required" }]}
        >
          <Input placeholder="mặc định = userId (lowercase)" />
        </Form.Item>

        {!isEdit && (
          <Form.Item name="password" label="Password (optional)">
            <Space.Compact style={{ width: "100%" }}>
              <Input.Password placeholder="Để trống sẽ tự sinh" />
              <Button
                onClick={() => {
                  const pwd = genPassword();
                  form.setFieldsValue({ password: pwd });
                }}
              >
                Generate
              </Button>
            </Space.Compact>
          </Form.Item>
        )}

        <Form.Item
          name="name"
          label="Full name"
          rules={[{ required: true, message: "Full name is required" }]}
        >
          <Input placeholder="Họ tên" />
        </Form.Item>

        <Form.Item name="email" label="Email">
          <Input placeholder="email@domain.com" />
        </Form.Item>

        <Form.Item name="phone" label="Phone">
          <Input placeholder="+84..." />
        </Form.Item>

        <Form.Item
          name="status"
          label="Status"
          rules={[{ required: true, message: "Status is required" }]}
        >
          <Select
            options={[
              { value: "active", label: "Active" },
              { value: "banned", label: "Banned" },
            ]}
          />
        </Form.Item>

        <Form.Item name="borrowLimit" label="Borrow limit">
          <Input type="number" min={0} />
        </Form.Item>

        {isStudent && (
          <>
            <Form.Item name="department" label="Department">
              <Input placeholder="CNTT, Kinh tế..." />
            </Form.Item>
            <Form.Item
              name="year"
              label="Year"
              rules={[
                ({ getFieldValue }) => ({
                  validator: (_, v) => {
                    if (v == null || v === "") return Promise.resolve();
                    const n = Number(v);
                    if (!Number.isInteger(n) || n < 1 || n > 10) {
                      return Promise.reject("Year phải là số nguyên 1–10");
                    }
                    return Promise.resolve();
                  }
                })
              ]}
            >
              <Input type="number" placeholder="1…10" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
