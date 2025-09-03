import { Typography, Empty } from "antd";

export default function Users() {
  return (
    <div>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Users</Typography.Title>
        <Typography.Text className="text-dim">Manage users (coming soon)</Typography.Text>
      </div>
      <Empty description="To be implemented" />
    </div>
  );
}
