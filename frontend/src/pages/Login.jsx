// src/pages/Login.jsx
import { useEffect } from "react";
import { Card, Form, Input, Button, Checkbox, App as AntdApp, Typography } from "antd";
import { useLoginMutation } from "@/services/authApi";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "@/store/authSlice";
import { saveAuth, getToken, getUser } from "@/utils/token";
import { useNavigate, useLocation } from "react-router-dom";
import "./Login.css";

const ALLOWED_ROLES = ["admin", "librarian"];

export default function Login() {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Nếu đã có token thì chuyển về trang trước đó hoặc "/"
  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (token && user) {
      navigate(location.state?.from || "/", { replace: true });
    }
  }, [navigate, location.state]);

  const onFinish = async (values) => {
    const { username, password, remember } = values || {};
    const payload = {
      username: String(username || "").trim(),
      password: String(password || ""),
      clientType: "web", // để BE set cookie refresh
    };

    if (!payload.username || !payload.password) {
      message.error("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    try {
      const res = await login(payload).unwrap();
      const role = res?.user?.role;

      // Chặn role ở FE admin
      if (!role || !ALLOWED_ROLES.includes(role)) {
        message.error("Tài khoản không có quyền truy cập trang Admin.");
        return;
      }

      // Lưu vào Redux + storage
      dispatch(loginSuccess({ token: res.accessToken, user: res.user }));
      // Nếu không nhớ đăng nhập, bạn có thể chỉ giữ Redux (không gọi saveAuth)
      // Ở đây mặc định vẫn lưu; muốn tách session/local thì mở rộng saveAuth.
      if (remember) {
        saveAuth(res.accessToken, res.user); // localStorage
      }

      message.success("Welcome back!");
      navigate("/", { replace: true });
    } catch (err) {
      const status = err?.status;
      const msg =
        err?.data?.message ||
        (status === 401 ? "Sai username hoặc password" :
         status === 403 ? "Tài khoản bị khoá hoặc không đủ quyền" :
         status === 429 ? "Thử lại sau (quá nhiều lần thử)" :
         "Login failed");
      message.error(msg);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" title="Library Admin Login" style={{ width: 380 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          initialValues={{ remember: true }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Vui lòng nhập username" }]}
          >
            <Input
              autoFocus
              autoComplete="username"
              allowClear
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Vui lòng nhập password" }]}
          >
            <Input.Password placeholder="••••••••" autoComplete="current-password" />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked" style={{ marginBottom: 8 }}>
            <Checkbox>Remember me</Checkbox>
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={isLoading}>
            Sign in
          </Button>

          <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
            Chỉ tài khoản <b>admin</b> / <b>librarian</b> mới được vào trang quản trị.
          </Typography.Paragraph>
        </Form>
      </Card>
    </div>
  );
}
