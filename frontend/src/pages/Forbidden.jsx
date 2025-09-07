// src/pages/Forbidden.jsx
import { Result, Button } from "antd";
import { Link } from "react-router-dom";

export default function Forbidden() {
  return (
    <Result
      status="403"
      title="403"
      subTitle="Bạn không có quyền truy cập trang này."
      extra={
        <Button type="primary">
          <Link to="/login">Đăng nhập tài khoản khác</Link>
        </Button>
      }
    />
  );
}
