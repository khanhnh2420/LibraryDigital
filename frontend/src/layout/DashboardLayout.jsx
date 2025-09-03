import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import SideNav from "@/components/SideNav";
import TopNav from "@/components/TopNav";

const { Content } = Layout;

export default function DashboardLayout() {
  return (
    <Layout>
      <SideNav />
      <Layout>
        <TopNav />
        <Content style={{ margin: "16px" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
