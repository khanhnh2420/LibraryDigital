import { useEffect, useMemo, useState } from "react";
import { App as AntdApp, Button, Input, Modal, Form, Space, Table, Typography, Popconfirm, Tag, Select, message } from "antd";
import {
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useSetUserStatusMutation,
  useResetPasswordMutation,
  useDeleteUserMutation
} from "@/services/usersApi";

function UpsertUserModal({ open, onClose, init }) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const isEdit = !!init?.userId;
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();

  useEffect(() => {
    if (open) form.setFieldsValue(init || { role: "student", status: "active", borrowLimit: 5 });
    else form.resetFields();
  }, [open, init]);

  const onSubmit = async () => {
    try {
      const v = await form.validateFields();
      if (isEdit) {
        await updateUser({ userId: init.userId, data: v }).unwrap();
        message.success("Updated user");
      } else {
        const res = await createUser(v).unwrap();
        message.success(
          res?.initialPassword
            ? `Created. Initial password: ${res.initialPassword}`
            : "Created"
        );
      }
      onClose(true);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.data?.message || "Save failed");
    }
  };

  return (
    <Modal
      title={isEdit ? "Edit User" : "Add User"}
      open={open}
      onCancel={() => onClose(false)}
      onOk={onSubmit}
      okButtonProps={{ loading: creating || updating }}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="userId" label="User ID" rules={[{ required: !isEdit }]}>
          <Input placeholder="SV24556083" disabled={isEdit} />
        </Form.Item>
        <Form.Item name="username" label="Username" rules={[{ required: true }]}>
          <Input placeholder="tên đăng nhập" />
        </Form.Item>
        {!isEdit && (
          <Form.Item name="password" label="Password (optional)">
            <Input.Password placeholder="Để trống sẽ tự sinh" />
          </Form.Item>
        )}
        <Form.Item name="name" label="Full name" rules={[{ required: true }]}>
          <Input placeholder="Họ tên" />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input placeholder="email@domain.com" />
        </Form.Item>
        <Form.Item name="phone" label="Phone">
          <Input placeholder="+84..." />
        </Form.Item>
        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "admin", label: "Admin" },
              { value: "librarian", label: "Librarian" },
              { value: "student", label: "Student" },
            ]}
          />
        </Form.Item>
        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "active", label: "Active" },
              { value: "banned", label: "Banned" },
            ]}
          />
        </Form.Item>
        <Form.Item name="borrowLimit" label="Borrow limit">
          <Input type="number" min={0} />
        </Form.Item>
        <Form.Item name="department" label="Department">
          <Input />
        </Form.Item>
        <Form.Item name="year" label="Year">
          <Input type="number" min={1} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default function Users() {
  const { message } = AntdApp.useApp();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  useEffect(() => { setQInput(q); }, [q]);
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const [role, setRole]     = useState();
  const [status, setStatus] = useState();

  const { data, isFetching, refetch } = useListUsersQuery({ page, pageSize, q, role, status });
  const [setUserStatus] = useSetUserStatusMutation();
  const [resetPassword] = useResetPasswordMutation();
  const [deleteUser] = useDeleteUserMutation();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const columns = useMemo(() => [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "User ID", dataIndex: "userId", key: "userId", width: 140 },
    { title: "Username", dataIndex: "username", key: "username", width: 140 },
    { title: "Email", dataIndex: "email", key: "email", width: 220 },
    { title: "Phone", dataIndex: "phone", key: "phone", width: 140 },
    { title: "Role", dataIndex: "role", key: "role", width: 120,
      render: (r) => <Tag color={r === "admin" ? "magenta" : r === "librarian" ? "geekblue" : "green"}>{r}</Tag> },
    { title: "Status", dataIndex: "status", key: "status", width: 120,
      render: (s) => <Tag color={s === "active" ? "green" : "red"}>{s}</Tag> },
    { title: "Borrow", dataIndex: "borrowLimit", key: "borrowLimit", width: 90, align: "right" },
    { title: "Dept", dataIndex: "department", key: "department", width: 160 },
    { title: "Year", dataIndex: "year", key: "year", width: 80, align: "right" },
    { title: "Last login", dataIndex: "lastLogin", key: "lastLogin", width: 180,
      render: (v) => (v ? new Date(v).toLocaleString() : "-") },
    {
      title: "Action",
      key: "action",
      width: 280,
      render: (_, r) => (
        <Space wrap>
          <Button size="small" onClick={() => { setEditing(r); setOpen(true); }}>Edit</Button>
          <Button
            size="small"
            onClick={async () => {
              try {
                const target = r.status === "active" ? "banned" : "active";
                await setUserStatus({ userId: r.userId, status: target }).unwrap();
                message.success(`Status → ${target}`);
                refetch();
              } catch (e) {
                message.error(e?.data?.message || "Update status failed");
              }
            }}
          >
            {r.status === "active" ? "Ban" : "Unban"}
          </Button>
          <Button
            size="small"
            onClick={async () => {
              try {
                const res = await resetPassword({ userId: r.userId }).unwrap();
                message.success(`New password: ${res?.newPassword}`);
              } catch (e) {
                message.error(e?.data?.message || "Reset failed");
              }
            }}
          >
            Reset Password
          </Button>
          <Popconfirm
            title="Delete this user?"
            description={`User: ${r.name} (${r.userId})`}
            onConfirm={async () => {
              try {
                await deleteUser(r.userId).unwrap();
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
  ], [setUserStatus, resetPassword, deleteUser, refetch, message]);

  return (
    <div>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Users</Typography.Title>
        <Space>
          <Select
            allowClear
            placeholder="Role"
            style={{ width: 150 }}
            options={[
              { value: "admin", label: "Admin" },
              { value: "librarian", label: "Librarian" },
              { value: "student", label: "Student" },
            ]}
            value={role}
            onChange={(v) => { setRole(v); setPage(1); }}
          />
          <Select
            allowClear
            placeholder="Status"
            style={{ width: 150 }}
            options={[
              { value: "active", label: "Active" },
              { value: "banned", label: "Banned" },
            ]}
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
          />
          <Input.Search
            value={qInput}
            allowClear
            placeholder="Search name / userId / username / email / phone…"
            onChange={(e) => setQInput(e.target.value)}
            onSearch={(v) => { setQ(v.trim()); setPage(1); }}
            style={{ width: 360 }}
          />
          <Button type="primary" onClick={() => { setEditing(null); setOpen(true); }}>
            Add User
          </Button>
        </Space>
      </div>

      <Table
        rowKey="userId"
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

      <UpsertUserModal
        open={open}
        init={editing}
        onClose={(ok) => { setOpen(false); setEditing(null); if (ok) refetch(); }}
      />
    </div>
  );
}
