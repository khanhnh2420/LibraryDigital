// src/pages/Users.jsx
import { useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Input,
  Space,
  Table,
  Typography,
  Popconfirm,
  Tag,
  Select,
} from "antd";
import {
  useListUsersQuery,
  useSetUserStatusMutation,
  useDeleteUserMutation,
} from "@/services/usersApi";
import UpsertUserModal from "@/components/users/UpsertUserModal";

export default function Users() {
  const { message } = AntdApp.useApp();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // search
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  useEffect(() => { setQInput(q); }, [q]);
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  // filters
  const [role, setRole] = useState();
  const [status, setStatus] = useState();

  const { data, isFetching, refetch } = useListUsersQuery({ page, pageSize, q, role, status });
  const [setUserStatus] = useSetUserStatusMutation();
  const [deleteUser] = useDeleteUserMutation();

  // modal state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const columns = useMemo(() => [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "User ID", dataIndex: "userId", key: "userId", width: 140 },
    { title: "Username", dataIndex: "username", key: "username", width: 140 },
    { title: "Email", dataIndex: "email", key: "email", width: 220 },
    { title: "Phone", dataIndex: "phone", key: "phone", width: 140 },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 120,
      render: (r) => (
        <Tag color={r === "admin" ? "magenta" : r === "librarian" ? "geekblue" : "green"}>
          {r}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s) => <Tag color={s === "active" ? "green" : "red"}>{s}</Tag>,
    },
    { title: "Borrow", dataIndex: "borrowLimit", key: "borrowLimit", width: 90, align: "right" },
    { title: "Dept", dataIndex: "department", key: "department", width: 160 },
    { title: "Year", dataIndex: "year", key: "year", width: 80, align: "right" },
    {
      title: "Last login",
      dataIndex: "lastLogin",
      key: "lastLogin",
      width: 180,
      render: (v) => (v ? new Date(v).toLocaleString() : "-"),
    },
    {
      title: "Action",
      key: "action",
      width: 280,
      render: (_, r) => (
        <Space wrap>
          <Button size="small" onClick={() => { setEditing(r); setOpen(true); }}>
            Edit
          </Button>
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
      ),
    },
  ], [setUserStatus, deleteUser, refetch, message]);

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
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
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
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      <UpsertUserModal
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
