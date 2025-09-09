import { useMemo, useState, useEffect } from "react";
import {
  Button,
  Input,
  Form,
  Space,
  Table,
  Typography,
  Popconfirm,
  message,
  Select,
  InputNumber,
} from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { useListBooksQuery, useDeleteBookMutation } from "@/services/booksApi";
import {
  useListCategoriesQuery,
  useListAuthorsQuery,
  useListPublishersQuery,
} from "@/services/refDataApi";

import AddBookModal from "@/components/books/AddBookModal";

export default function Books() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // q = query thực tế gửi BE; qInput = giá trị đang gõ
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");

  // đồng bộ qInput khi q đổi (ví dụ khi clear)
  useEffect(() => {
    setQInput(q);
  }, [q]);

  // Debounce: sau 400ms không gõ tiếp thì tìm
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  // Filters
  const [categoryId, setCategoryId] = useState();
  const [authorId, setAuthorId] = useState();
  const [publisherId, setPublisherId] = useState();
  const [year, setYear] = useState();

  // Ref data
  const { data: cats } = useListCategoriesQuery({ limit: 200, q: "" });
  const { data: authors } = useListAuthorsQuery({ limit: 200, q: "" });
  const { data: pubs } = useListPublishersQuery({ limit: 200, q: "" });

  // List books with filters
  const { data, isFetching, refetch } = useListBooksQuery({
    page,
    pageSize,
    q,
    categoryId,
    authorId,
    publisherId,
    year,
  });

  const [deleteBook] = useDeleteBookMutation();

  const columns = useMemo(
    () => [
      {
        title: "Title",
        dataIndex: "title",
        key: "title",
        render: (t, r) => (
          <Typography.Link onClick={() => navigate(`/books/${r.bookId}`)}>
            {t}
          </Typography.Link>
        ),
      },
      {
        title: "Author",
        key: "author",
        render: (_, r) =>
          (r.author && r.author.name) || r.authorName || "-",
      },
      {
        title: "Publisher",
        key: "publisher",
        render: (_, r) =>
          (r.publisher && r.publisher.name) || r.publisherName || "-",
      },
      { title: "Year", dataIndex: "year", key: "year", width: 80 },
      { title: "ISBN", dataIndex: "isbn", key: "isbn", width: 140 },
      {
        title: "Action",
        key: "action",
        render: (_, r) => (
          <Space>
            <Popconfirm
              title="Delete this book?"
              onConfirm={async () => {
                try {
                  await deleteBook(r.bookId).unwrap();
                  message.success("Deleted");
                  refetch();
                } catch (e) {
                  message.error(e?.data?.message || "Delete failed");
                }
              }}
            >
              <Button danger size="small">
                Delete
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [navigate, deleteBook, refetch]
  );

  const clearAllFilters = () => {
    setCategoryId(undefined);
    setAuthorId(undefined);
    setPublisherId(undefined);
    setYear(undefined);
    setPage(1);
  };

  return (
    <div>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Books
        </Typography.Title>
        <Space direction="vertical" size={4} align="end">
          <Space wrap>
            {/* Category */}
            <Select
              allowClear
              placeholder="Category"
              style={{ width: 180 }}
              options={(cats?.items ?? []).map((c) => ({
                value: c.categoryId,
                label: c.name,
              }))}
              value={categoryId}
              onChange={(v) => {
                setCategoryId(v);
                setPage(1);
              }}
            />

            {/* Author */}
            <Select
              allowClear
              showSearch
              placeholder="Author"
              style={{ width: 220 }}
              optionFilterProp="label"
              options={(authors?.items ?? []).map((a) => ({
                value: a.authorId,
                label: a.name,
              }))}
              value={authorId}
              onChange={(v) => {
                setAuthorId(v);
                setPage(1);
              }}
            />

            {/* Publisher */}
            <Select
              allowClear
              showSearch
              placeholder="Publisher"
              style={{ width: 220 }}
              optionFilterProp="label"
              options={(pubs?.items ?? []).map((p) => ({
                value: p.publisherId,
                label: p.name,
              }))}
              value={publisherId}
              onChange={(v) => {
                setPublisherId(v);
                setPage(1);
              }}
            />

            {/* Year */}
            <InputNumber
              placeholder="Year"
              style={{ width: 120 }}
              value={year}
              min={0}
              onChange={(v) => {
                setYear(v ?? undefined);
                setPage(1);
              }}
            />

            <Input.Search
              value={qInput}
              allowClear
              placeholder="Search title / description / ISBN …  (tips: id:BK..., isbn:...)"
              onChange={(e) => setQInput(e.target.value)}
              onSearch={(v) => {
                setQ(v.trim());
                setPage(1);
              }} // Enter/click tìm ngay (bỏ debounce)
              style={{ width: 360 }}
            />

            <Button
              onClick={clearAllFilters}
            >
              Clear filters
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setOpen(true)}
            >
              Add Book
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              loading={isFetching}
            >
              Refresh
            </Button>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Mẹo: <code>id:BKxxxxx</code> tìm theo Book ID ·{" "}
            <code>isbn:7109441176351</code> hoặc chỉ gõ số ISBN ·
            có thể lọc theo Category / Author / Publisher / Year
          </Typography.Text>
        </Space>
      </div>

      <Table
        rowKey="bookId"
        loading={isFetching}
        dataSource={data?.items || []}
        columns={columns}
        pagination={{
          current: data?.page || page,
          pageSize: data?.pageSize || pageSize,
          total: data?.total || 0,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <AddBookModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => refetch()} // refetch lại list
      />
    </div>
  );
}
