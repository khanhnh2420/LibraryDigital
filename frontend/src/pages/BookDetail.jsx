import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card, Descriptions, Typography, Row, Col, Tag, Space, Button,
  Statistic, Progress, Image, Skeleton, Result, Popconfirm, message, Tooltip, Divider
} from "antd";
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, BookOutlined,
  UserOutlined, HomeOutlined, BarcodeOutlined, CalendarOutlined, EnvironmentOutlined
} from "@ant-design/icons";
import { useGetBookQuery, useDeleteBookMutation } from "@/services/booksApi";

const fmt = (v) => (v == null || v === "" ? "-" : v);
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "-");

export default function BookDetail() {
  const { id } = useParams();            // id = bookId
  const navigate = useNavigate();
  const { data, isFetching, error, refetch } = useGetBookQuery(id);
  const [deleteBook, { isLoading: deleting }] = useDeleteBookMutation();

  const book = data || {};

  const authorName = book.author?.name ?? book.authorName ?? "-";
  const publisherName = book.publisher?.name ?? book.publisherName ?? "-";
  const categoryName = book.category?.name ?? book.categoryName ?? "-";

  const quantity = Number.isFinite(book.quantity) ? book.quantity : 0;
  const available = Number.isFinite(book.available) ? book.available : 0;
  const percent = quantity > 0 ? Math.round((available / quantity) * 100) : 0;

  const stockTag = useMemo(() => {
    if (quantity === 0) return <Tag color="default">Chưa nhập kho</Tag>;
    if (available <= 0) return <Tag color="red">Hết sách</Tag>;
    if (available <= 2) return <Tag color="gold">Sắp hết</Tag>;
    return <Tag color="green">Còn sách</Tag>;
  }, [available, quantity]);

  if (error) {
    return (
      <Result
        status={error?.status === 404 ? "404" : "error"}
        title={error?.status === 404 ? "Không tìm thấy sách" : "Không tải được dữ liệu"}
        subTitle={error?.data?.message || "Vui lòng thử lại."}
        extra={<Button onClick={() => refetch()}>Thử lại</Button>}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Book Detail
          </Typography.Title>
          <Tag icon={<BookOutlined />} color="blue">#{id}</Tag>
          {stockTag}
        </Space>
        <Space>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/books/${id}/edit`)} disabled={!data}>
            Edit
          </Button>
          <Popconfirm
            title="Xoá sách này?"
            okText="Xoá"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={async () => {
              try {
                await deleteBook(id).unwrap();
                message.success("Đã xoá sách");
                navigate("/books");
              } catch (e) {
                message.error(e?.data?.message || "Xoá thất bại");
              }
            }}
          >
            <Button danger icon={<DeleteOutlined />} loading={deleting}>Delete</Button>
          </Popconfirm>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {/* Cover */}
        <Col xs={24} md={8} lg={7}>
          <Card title="Image" loading={isFetching}>
            {isFetching ? (
              <Skeleton.Image active style={{ width: "100%", height: 360 }} />
            ) : (
              <Image
                src={book.coverImage}
                alt={book.title}
                width="100%"
                height={360}
                style={{ objectFit: "cover", borderRadius: 8 }}
                fallback="https://via.placeholder.com/600x800?text=No+Cover"
                placeholder
              />
            )}
            <Divider style={{ margin: "16px 0" }} />
            <Space direction="vertical" size={4}>
              <Tooltip title="Book ID">
                <Typography.Text type="secondary" copyable={{ text: fmt(book.bookId) }}>
                  <BarcodeOutlined /> {fmt(book.bookId)}
                </Typography.Text>
              </Tooltip>
              <Tooltip title="ISBN">
                <Typography.Text type="secondary" copyable={{ text: fmt(book.isbn) }}>
                  <BarcodeOutlined /> {fmt(book.isbn)}
                </Typography.Text>
              </Tooltip>
            </Space>
          </Card>
        </Col>

        {/* Details */}
        <Col xs={24} md={16} lg={17}>
          {/* Overview */}
          <Card title="Overview" loading={isFetching} style={{ marginBottom: 16 }}>
            {isFetching ? (
              <Skeleton active />
            ) : (
              <>
                <Typography.Title level={4} style={{ marginTop: 0 }}>{fmt(book.title)}</Typography.Title>
                <Space wrap size={[8, 8]}>
                  {book.language ? <Tag>{book.language}</Tag> : null}
                  {categoryName !== "-" ? <Tag color="purple">{categoryName}</Tag> : null}
                </Space>

                <Descriptions
                  column={{ xs: 1, sm: 1, md: 2 }}
                  bordered
                  size="middle"
                  style={{ marginTop: 16 }}
                >
                  <Descriptions.Item label="Author">
                    <Space><UserOutlined /> {fmt(authorName)}</Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Publisher">
                    <Space><HomeOutlined /> {fmt(publisherName)}</Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Year">
                    <Space><CalendarOutlined /> {fmt(book.year)}</Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Language">{fmt(book.language)}</Descriptions.Item>
                  <Descriptions.Item label="Location">
                    <Space><EnvironmentOutlined /> {fmt(book.location)}</Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="ISBN">
                    <Typography.Text copyable>{fmt(book.isbn)}</Typography.Text>
                  </Descriptions.Item>
                </Descriptions>

                <Divider />

                <Typography.Title level={5}>Description</Typography.Title>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  {fmt(book.description)}
                </Typography.Paragraph>
              </>
            )}
          </Card>

          {/* Inventory */}
          <Card title="Inventory" loading={isFetching}>
            {isFetching ? (
              <Skeleton active />
            ) : (
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <Statistic title="Quantity" value={quantity} />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic title="Available" value={available} />
                </Col>
                <Col xs={24} sm={8}>
                  <Statistic title="Available (%)" value={percent} suffix="%" />
                </Col>
                <Col span={24} style={{ marginTop: 12 }}>
                  <Progress percent={percent} status={available <= 0 ? "exception" : undefined} />
                </Col>
              </Row>
            )}
          </Card>

          {/* Meta times */}
          <Card size="small" style={{ marginTop: 16 }} loading={isFetching}>
            {isFetching ? (
              <Skeleton active />
            ) : (
              <Space wrap size={[24, 8]}>
                <Typography.Text type="secondary">
                  Created: {fmtDate(book.createdAt)}
                </Typography.Text>
                <Typography.Text type="secondary">
                  Updated: {fmtDate(book.updatedAt)}
                </Typography.Text>
              </Space>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
