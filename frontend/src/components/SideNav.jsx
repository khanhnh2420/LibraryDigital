import { Layout, Menu } from "antd";
import { BookOutlined, AppstoreOutlined, DashboardOutlined, TeamOutlined, FileSyncOutlined, SolutionOutlined, BankOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";

const { Sider } = Layout;
SolutionOutlined
export default function SideNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { key: "/", icon: <DashboardOutlined />, label: "Dashboard", onClick: () => navigate("/") },
    { key: "/books", icon: <BookOutlined />, label: "Books", onClick: () => navigate("/books") },
    { key: "/categories", icon: <AppstoreOutlined />, label: "Categories", onClick: () => navigate("/categories") },
    { key: "/authors", icon: <SolutionOutlined />, label: "Authors", onClick: () => navigate("/authors") },
    { key: "/publishers", icon: <BankOutlined />, label: "Publishers", onClick: () => navigate("/publishers") },
    { key: "/loans", icon: <FileSyncOutlined />, label: "Loans", onClick: () => navigate("/loans") },
    { key: "/users", icon: <TeamOutlined />, label: "Users", onClick: () => navigate("/users") }
  ];

  return (
    <Sider breakpoint="lg" collapsedWidth="0">
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={items}
      />
    </Sider>
  );
}
