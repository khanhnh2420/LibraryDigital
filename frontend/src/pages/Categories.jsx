// src/pages/Categories.jsx
import { useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Input,
  Modal,
  Form,
  Space,
  Table,
  Typography,
  Popconfirm,
} from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  useListCategoriesPagedQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from "@/services/categoriesApi";

function UpsertCategoryModal({ open, onClose, init }) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const isEdit = !!init?.categoryId;

  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();

  useEffect(() => {
    if (open) form.setFieldsValue(init || {});
    else form.resetFields();
  }, [open, init, form]);

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (isEdit) {
        await updateCategory({ categoryId: init.categoryId, data: values }).unwrap();
        message.success("Updated category");
      } else {
        await createCategory(values).unwrap();
        message.success("Created category");
      }
      onClose(true);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.data?.message || "Save failed");
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit Category" : "Add Category"}
      open={open}
      onCancel={() => onClose(false)}
      onOk={onSubmit}
      okButtonProps={{ loading: creating || updating }}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: "Name is required" }]}
        >
          <Input placeholder="Tên danh mục" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea placeholder="Mô tả" autoSize={{ minRows: 2, maxRows: 4 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function Categories() {
  const { message } = AntdApp.useApp();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  useEffect(() => {
    setQInput(q);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const { data, isFetching, refetch } = useListCategoriesPagedQuery({ page, pageSize, q });
  const [deleteCategory] = useDeleteCategoryMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const columns = useMemo(
    () => [
      { title: "Name", dataIndex: "name", key: "name" },
      { title: "Category ID", dataIndex: "categoryId", key: "categoryId", width: 140 },
      {
        title: "Books",
        dataIndex: "bookCount",
        key: "bookCount",
        width: 100,
        align: "right",
        render: (v) => v ?? "-",
      },
      { title: "Description", dataIndex: "description", key: "description", ellipsis: true },
      {
        title: "Action",
        key: "action",
        width: 180,
        render: (_, r) => (
          <Space>
            <Button
              size="small"
              onClick={() => {
                setEditing(r);
                setOpen(true);
              }}
            >
              Edit
            </Button>
            <Popconfirm
              title="Delete this category?"
              description={`Danh mục: ${r.name}`}
              onConfirm={async () => {
                try {
                  await deleteCategory(r.categoryId).unwrap();
                  message.success("Deleted");
                  refetch();
                } catch (e) {
                  if (e?.status === 409) {
                    message.error(e?.data?.message || "Không thể xoá: Category đang được dùng");
                  } else {
                    message.error(e?.data?.message || "Delete failed");
                  }
                }
              }}
            >
              <Button danger size="small">Delete</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deleteCategory, refetch, message]
  );

  return (
    <div>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>
          Categories
        </Typography.Title>
        <Space>
          <Input.Search
            value={qInput}
            allowClear
            placeholder="Search category name/ID…"
            onChange={(e) => setQInput(e.target.value)}
            onSearch={(v) => {
              setQ(v.trim());
              setPage(1);
            }}
            style={{ width: 320 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Add Category
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
            Refresh
          </Button>
        </Space>
      </div>

      <Table
        rowKey="categoryId"
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

      <UpsertCategoryModal
        open={open}
        init={editing}
        onClose={(ok) => {
          setOpen(false);
          setEditing(null);
          if (ok) refetch();
        }}
      />
    </div>
  );
}
