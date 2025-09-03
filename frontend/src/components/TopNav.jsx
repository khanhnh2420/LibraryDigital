import { Layout, Dropdown, Typography } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "@/store/authSlice";
import { clearAuth } from "@/utils/token";
import { useNavigate } from "react-router-dom";

const { Header } = Layout;

export default function TopNav() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const items = [
    { key: "profile", label: "Profile", icon: <UserOutlined /> },
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
      onClick: () => {
        dispatch(logout());
        clearAuth();
        navigate("/login");
      }
    }
  ];

  return (
    <Header style={{ background: "#fff", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div className="logo">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h16v2H4V4zm0 5h16v2H4V9zm0 5h16v2H4v-2zm0 5h16v2H4v-2z"/>
        </svg>
        Library Admin
      </div>
      <Dropdown menu={{ items }} trigger={["click"]}>
        <Typography.Link style={{ fontWeight: 600 }}>
          {user?.name || user?.username || "Account"}
        </Typography.Link>
      </Dropdown>
    </Header>
  );
}
