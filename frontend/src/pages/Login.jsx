import { Card, Form, Input, Button, message } from "antd";
import { useLoginMutation } from "@/services/authApi";
import { useDispatch } from "react-redux";
import { loginSuccess } from "@/store/authSlice";
import { saveAuth } from "@/utils/token";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const [form] = Form.useForm();
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const res = await login(values).unwrap();
      dispatch(loginSuccess({ token: res.accessToken, user: res.user }));
      saveAuth(res.accessToken, res.user);
      message.success("Welcome back!");
      navigate("/");
    } catch (err) {
      message.error(err?.data?.message || "Login failed");
    }
  };

  return (
    <div className="login-container">
      <Card
        className="login-card"
        title="Library Admin Login"
        style={{ width: 360 }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input autoFocus placeholder="Enter username" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password placeholder="Enter password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={isLoading}>
            Sign in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
