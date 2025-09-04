import { useMemo, useState, useEffect } from "react";
import { Button, Input, Modal, Form, Space, Table, Typography, Popconfirm, message, Upload, Select } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { useListBooksQuery, useDeleteBookMutation } from "@/services/booksApi";
import { useListCategoriesQuery } from "@/services/refDataApi";

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
  useEffect(() => { setQInput(q); }, [q]);

  // Debounce: sau 400ms không gõ tiếp thì tìm
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const [categoryId, setCategoryId] = useState();
  const { data: cats } = useListCategoriesQuery({ limit: 200 });

  const { data, isFetching, refetch } = useListBooksQuery({ page, pageSize, q, categoryId });
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
        )
      },
      { title: "Author", key: "author", render: (_, r) => (r.author && r.author.name) || r.authorName || "-" },
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
              <Button danger size="small">Delete</Button>
            </Popconfirm>
          </Space>
        )
      }
    ],
    [navigate, deleteBook, refetch]
  );

  return (
    <div>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Books</Typography.Title>
        <Space direction="vertical" size={4} align="end">
          <Space>
            <Select
              allowClear
              placeholder="Category"
              style={{ width: 180 }}
              options={(cats?.items ?? []).map(c => ({ value: c.categoryId, label: c.name }))}
              value={categoryId}
              onChange={(v) => { setCategoryId(v); setPage(1); }}
            />
            <Input.Search
              value={qInput}
              allowClear
              placeholder="Search title / description / ISBN …  (tips: id:BK000123, isbn:7109...)"
              onChange={(e) => setQInput(e.target.value)}
              onSearch={(v) => { setQ(v.trim()); setPage(1); }} // Enter/click tìm ngay (bỏ debounce)
              style={{ width: 360 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Add Book
            </Button>
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Mẹo: <code>id:BK000123</code> tìm theo Book ID · <code>isbn:7109441176351</code> hoặc chỉ gõ số ISBN
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
          onChange: (p, ps) => { setPage(p); setPageSize(ps); }
        }}
      />

      <AddBookModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => refetch()}  // refetch lại list
      />
    </div>
  );
}
