import { Typography, Empty } from "antd";

export default function Loans() {
  return (
    <div>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Loans</Typography.Title>
        <Typography.Text className="text-dim">Manage borrow/return (coming soon)</Typography.Text>
      </div>
      <Empty description="To be implemented" />
    </div>
  );
}
