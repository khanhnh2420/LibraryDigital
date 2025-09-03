import { useMemo, useState } from "react";
import { Button, Input, Modal, Form, Space, Table, Typography, Popconfirm, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useListBooksQuery, useCreateBookMutation, useDeleteBookMutation } from "@/services/booksApi";
import { useNavigate } from "react-router-dom";

export default function Books() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const { data, isFetching } = useListBooksQuery({ page, pageSize, q });
  const [createBook, { isLoading: isCreating }] = useCreateBookMutation();
  const [deleteBook] = useDeleteBookMutation();

  const columns = useMemo(
    () => [
      { title: "Title", dataIndex: "title", key: "title",
        render: (t, r) => <Typography.Link onClick={() => navigate(`/books/${r.id}`)}>{t}</Typography.Link> },
      { title: "Author", key: "author", render: (_, r) => (r.author && r.author.name) || "-" },
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
                  await deleteBook(r.id).unwrap();
                  message.success("Deleted");
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
    [navigate, deleteBook]
  );

  const onCreate = async () => {
    try {
      const values = await form.validateFields();
      await createBook(values).unwrap();
      message.success("Book created");
      setOpen(false);
      form.resetFields();
    } catch (err) {
      if (err?.errorFields) return; // form invalid
      message.error(err?.data?.message || "Create failed");
    }
  };

  return (
    <div>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Books</Typography.Title>
        <Space>
          <Input.Search placeholder="Search title/ISBN..." allowClear onSearch={(v) => { setQ(v); setPage(1); }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Add Book</Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={(data && data.items) || []}
        columns={columns}
        pagination={{
          current: (data && data.page) || page,
          pageSize: (data && data.pageSize) || pageSize,
          total: (data && data.total) || 0,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); }
        }}
      />

      <Modal
        title="Add Book"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onCreate}
        okButtonProps={{ loading: isCreating }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="isbn" label="ISBN">
            <Input />
          </Form.Item>
          <Form.Item name="year" label="Year">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="language" label="Language">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
