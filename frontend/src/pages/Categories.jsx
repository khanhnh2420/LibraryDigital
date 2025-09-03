import { Typography, Empty } from "antd";

export default function Categories() {
  return (
    <div>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Categories</Typography.Title>
        <Typography.Text className="text-dim">Manage categories (coming soon)</Typography.Text>
      </div>
      <Empty description="To be implemented" />
    </div>
  );
}
