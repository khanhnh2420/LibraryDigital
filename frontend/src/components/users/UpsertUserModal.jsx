import { useEffect, useMemo } from "react";
import {
  App as AntdApp,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Row,
  Col,
  Divider,
  Tooltip,
} from "antd";
import {
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  useCreateUserMutation,
  useUpdateUserMutation,
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

export default function UpsertUserModal({ open, onClose, init }) {
  const isEdit = !!init?.userId;
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();

  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();

  // Prefill / reset
  useEffect(() => {
    if (open) {
      if (isEdit) {
        form.setFieldsValue({
          ...init,
          idNumber: init.userId
            ? String(init.userId).replace(/^\D+/g, "")
            : "",
        });
      } else {
        form.setFieldsValue({
          role: "student",
          status: "active",
          borrowLimit: 5,
          idNumber: "",
          userId: "",
          username: "",
          password: "",
        });
      }
    } else {
      form.resetFields();
    }
  }, [open, isEdit, init, form]);

  // Watch fields
  const role = Form.useWatch("role", form);
  const idNumber = Form.useWatch("idNumber", form);

  useEffect(() => {
    if (isEdit) return;

    const prefix = rolePrefix(role);
    const digits = String(idNumber || "").replace(/\D+/g, "");
    const userId = digits ? `${prefix}${digits}` : "";
    const currentUsername = form.getFieldValue("username");

    form.setFieldsValue({
      userId,
      username:
        !currentUsername || currentUsername === currentUsername.toLowerCase()
          ? userId?.toLowerCase() || ""
          : currentUsername,
      borrowLimit: role === "student" ? 5 : 10,
    });
  }, [role, idNumber, isEdit, form]);

  const isStudent = useMemo(
    () => String(role || "").toLowerCase() === "student",
    [role]
  );

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = { ...values };

      if (!isEdit) {
        if (!payload.userId) {
          message.error("Vui lòng nhập mã số để tạo userId");
          return;
        }
        if (!payload.username) {
          payload.username = payload.userId.toLowerCase();
        }
      } else {
        delete payload.idNumber;
        delete payload.password; // đổi mật khẩu ở nơi khác
        delete payload.userId; // không đổi userId
      }

      if (payload.borrowLimit != null)
        payload.borrowLimit = Number(payload.borrowLimit);
      if (payload.year != null && payload.year !== "")
        payload.year = Number(payload.year);

      if (isEdit) {
        await updateUser({ userId: init.userId, data: payload }).unwrap();
        message.success("Updated user");
      } else {
        await createUser(payload).unwrap();
        message.success("Created");
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
      destroyOnHidden
      width={900}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        colon={false}
      >
        {/* SECTION: Role & ID */}
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Divider orientation="left">
              Role & ID{" "}
              <Tooltip title="Role ảnh hưởng prefix của User ID (SV/GV/AD)">
                <InfoCircleOutlined style={{ marginLeft: 8 }} />
              </Tooltip>
            </Divider>
          </Col>

          <Col xs={24} md={8}>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true, message: "Role is required" }]}
            >
              <Select
                options={ROLE_OPTIONS}
                disabled={isEdit}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>

          {!isEdit && (
            <>
              <Col xs={24} md={8}>
                <Form.Item
                  name="idNumber"
                  label="ID Number"
                  tooltip="Chỉ nhập chữ số; sẽ ghép với prefix theo Role"
                  rules={[
                    { required: true, message: "ID Number is required" },
                    {
                      validator: (_, v) => {
                        if (!v) return Promise.resolve();
                        const digits = String(v).replace(/\D+/g, "");
                        if (!digits) return Promise.reject("Chỉ nhập chữ số");
                        if (digits.length < 4)
                          return Promise.reject("Tối thiểu 4 chữ số");
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    allowClear
                    placeholder="VD: 24550020"
                    onChange={(e) => {
                      const raw = e.target.value || "";
                      form.setFieldsValue({ idNumber: raw });
                    }}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="userId" label="User ID (auto)">
                  <Input disabled />
                </Form.Item>
              </Col>
            </>
          )}
        </Row>

        {/* SECTION: Credentials */}
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Divider orientation="left">Credentials</Divider>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: "Username is required" }]}
            >
              <Input allowClear placeholder="VD: 24550020" />
            </Form.Item>
          </Col>

          {!isEdit && (
            <Col xs={24} md={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: "Password is required" }]}
              >
                <Input.Password placeholder="Nhập mật khẩu" />
              </Form.Item>
            </Col>
          )}
        </Row>

        {/* SECTION: Profile */}
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Divider orientation="left">Profile</Divider>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="Full name"
              rules={[{ required: true, message: "Full name is required" }]}
            >
              <Input allowClear placeholder="Họ tên" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Email không hợp lệ" },
              ]}
            >
              <Input allowClear placeholder="email@domain.com" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="phone" label="Phone">
              <Input allowClear placeholder="+84..." />
            </Form.Item>
          </Col>
        </Row>

        {/* SECTION: Library Settings */}
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Divider orientation="left">Library Settings</Divider>
          </Col>

          <Col xs={24} md={12}>
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
          </Col>

          <Col xs={24} md={12}>
            <Form.Item name="borrowLimit" label="Borrow limit">
              <InputNumber
                min={0}
                style={{ width: "100%" }}
                placeholder="Số sách tối đa được mượn"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* SECTION: Student details */}
        {isStudent && (
          <Row gutter={[16, 8]}>
            <Col span={24}>
              <Divider orientation="left">Student details</Divider>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item name="department" label="Department">
                <Input allowClear placeholder="CNTT, Kinh tế..." />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="year"
                label={
                  <>
                    Year{" "}
                    <Tooltip title="Số nguyên 1–10">
                      <InfoCircleOutlined />
                    </Tooltip>
                  </>
                }
                rules={[
                  () => ({
                    validator: (_, v) => {
                      if (v == null || v === "") return Promise.resolve();
                      const n = Number(v);
                      if (!Number.isInteger(n) || n < 1 || n > 10) {
                        return Promise.reject("Year phải là số nguyên 1–10");
                      }
                      return Promise.resolve();
                    },
                  }),
                ]}
              >
                <InputNumber min={1} max={10} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Form>
    </Modal>
  );
}
