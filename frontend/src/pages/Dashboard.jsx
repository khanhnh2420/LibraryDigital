// src/pages/Dashboard.jsx
import { Card, Statistic, Row, Col, Typography, Table, Skeleton, Result, Tag } from "antd";
import { BookOutlined, TeamOutlined, FileSyncOutlined } from "@ant-design/icons";
import { List, Progress, theme } from "antd";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";

import { useDashboardSummaryQuery } from "@/services/dashboardApi";

export default function Dashboard() {
  const { token } = theme.useToken();
  const { data, isFetching, error, refetch } = useDashboardSummaryQuery();

  const columns = [
    { title: "User", dataIndex: "userName", key: "userName", width: 180 },
    { title: "Book", dataIndex: "bookTitle", key: "bookTitle", ellipsis: true },
    {
      title: "Due",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 160,
      render: (v) => (v ? new Date(v).toLocaleString() : "-")
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s) => {
        const map = {
          "DangMuon": { color: "blue", text: "Đang mượn" },
          "QuaHan": { color: "red", text: "Quá hạn" },
          "DaTra": { color: "green", text: "Đã trả" },
          "ChoNhan": { color: "gold", text: "Đang chờ mượn" }
        };
        const m = map[s] || { color: "default", text: s || "-" };
        return <Tag color={m.color}>{m.text}</Tag>;
      }
    }
  ];

  const catData = (data?.topCategories || []).map(c => ({
    name: c.name || c.categoryId,
    total: c.total ?? 0
  }));


  if (error) {
    return (
      <Result
        status="error"
        title="Không tải được dữ liệu tổng quan"
        subTitle={error?.data?.message || "Vui lòng thử lại."}
        extra={<a onClick={() => refetch()}>Thử lại</a>}
      />
    );
  }


  return (
    <div>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Dashboard</Typography.Title>
        <Typography.Text className="text-dim">Tổng quan thư viện</Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            {isFetching ? <Skeleton active paragraph={false} title={{ width: 100 }} /> : (
              <Statistic title="Books" value={data?.books ?? 0} prefix={<BookOutlined />} />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            {isFetching ? <Skeleton active paragraph={false} title={{ width: 120 }} /> : (
              <Statistic title="Active Loans" value={data?.activeLoans ?? 0} prefix={<FileSyncOutlined />} />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            {isFetching ? <Skeleton active paragraph={false} title={{ width: 80 }} /> : (
              <Statistic title="Users" value={data?.users ?? 0} prefix={<TeamOutlined />} />
            )}
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }} title="Recent Loans">
        {isFetching
          ? <Skeleton active />
          : (
            <Table
              rowKey={(r) => r.id || r.loanId || `${r.userName}-${r.bookTitle}-${r.dueDate}`}
              columns={columns}
              dataSource={data?.recentLoans || []}
              pagination={{ pageSize: 5 }}
              locale={{ emptyText: "Chưa có bản ghi mượn gần đây" }}
            />
          )
        }
      </Card>

      <Card style={{ marginTop: 16 }} title="Top categories (30 ngày)">
        {isFetching ? (
          <Skeleton active />
        ) : catData.length ? (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={catData} fill={token.colorPrimary} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Typography.Text type="secondary">Chưa có dữ liệu top categories</Typography.Text>
        )}
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} md={8}>
          <Card>
            {isFetching ? <Skeleton active paragraph={false} /> : (
              <Statistic title="Overdue" value={data?.overdue ?? 0} />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            {isFetching ? <Skeleton active paragraph={false} /> : (
              <Statistic title="Near-expire batches (12h)" value={data?.nearExpireBatches ?? 0} />
            )}
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            {isFetching ? <Skeleton active paragraph={false} /> : (
              <>
                <Typography.Text>Batch conversion (30d)</Typography.Text>
                <Progress percent={data?.conversionRate ?? 0} />
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }} title="Loans trend (14 days)">
        {isFetching ? <Skeleton active /> : (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={(data?.loansTrend || []).map(d => ({ date: d._id, count: d.count }))}>
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="Low stock">
            {isFetching ? <Skeleton active /> : (
              <List
                dataSource={data?.lowStock || []}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.title} description={`BookId: ${it.bookId}`} />
                    <Tag color={it.available <= 1 ? "red" : "gold"}>{it.available}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="Top books (30d)">
            {isFetching ? <Skeleton active /> : (
              <List
                dataSource={data?.topBooks || []}
                renderItem={(b) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<img alt="" src={b.coverImage} style={{ width: 40, height: 56, objectFit: "cover", borderRadius: 4 }} />}
                      title={b.title}
                      description={`Mượn: ${b.total} lần`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
