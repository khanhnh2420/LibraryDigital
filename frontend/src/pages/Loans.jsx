// src/pages/Loans.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  App as AntdApp,
  Button,
  Input,
  Space,
  Table,
  Tag,
  Typography,
  Segmented,
  Popconfirm,
  message as antdMessage,
} from "antd";
import dayjs from "dayjs";
import {
  useListBatchesQuery,
  useConfirmByShortCodeMutation,
  useConfirmByQrMutation,
  useCancelHoldMutation,
} from "@/services/loansApi";

const statusMap = {
  ChoNhan: { color: "gold", text: "Chờ nhận" },
  DangMuon: { color: "blue", text: "Đang mượn" },
  DaTra: { color: "green", text: "Đã trả" },
  Huy: { color: "red", text: "Đã huỷ" },
};

function StatusTag({ s }) {
  const m = statusMap[s] || { color: "default", text: s || "-" };
  return <Tag color={m.color}>{m.text}</Tag>;
}

function fmt(dt) {
  if (!dt) return "-";
  return dayjs(dt).format("DD/MM/YYYY HH:mm");
}

export default function Loans() {
  // message theo chuẩn AntD App (nếu root bạn chưa bọc <App/>, dùng fallback để tránh warning)
  const _ctx = AntdApp.useApp?.();
  const message = _ctx?.message || antdMessage;

  // Bộ lọc
  const [status, setStatus] = useState("ChoNhan"); // default: hàng chờ nhận tại quầy
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Tìm kiếm text (userId / batchId / tên)
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  useEffect(() => setQInput(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  // Scan input cho máy quét
  const [scanValue, setScanValue] = useState("");
  const scanRef = useRef(null);
  useEffect(() => { scanRef.current?.focus(); }, []);

  // API hooks
  const { data, isFetching, refetch } = useListBatchesQuery({ status, page, pageSize, q });
  const [confirmShort, { isLoading: loadingShort }] = useConfirmByShortCodeMutation();
  const [confirmQr, { isLoading: loadingQr }] = useConfirmByQrMutation();
  const [cancelHold, { isLoading: loadingCancel }] = useCancelHoldMutation();

  // Helpers nhận dạng mã
  const isShortCode = (s) => /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test((s || "").trim());

  const handleScanConfirm = async (raw) => {
    const code = (raw || "").trim();
    if (!code) return;
    try {
      if (isShortCode(code)) {
        await confirmShort({ shortCode: code.toUpperCase() }).unwrap();
      } else {
        await confirmQr({ qrToken: code }).unwrap();
      }
      message.success("Xác nhận nhận sách thành công");
      setScanValue("");
      refetch();
    } catch (e) {
      // fallback thử loại còn lại (phòng khi đoán sai)
      try {
        if (isShortCode(code)) {
          await confirmQr({ qrToken: code }).unwrap();
        } else {
          await confirmShort({ shortCode: code.toUpperCase() }).unwrap();
        }
        message.success("Xác nhận nhận sách thành công");
        setScanValue("");
        refetch();
      } catch (err2) {
        message.error(err2?.data?.message || "Xác nhận thất bại");
        setScanValue("");
      }
    } finally {
      requestAnimationFrame(() => scanRef.current?.focus());
    }
  };

  // Bảng con hiển thị sách trong batch
  const loanColumns = useMemo(
    () => [
      { title: "Book ID", dataIndex: "bookId", key: "bookId", width: 120 },
      { title: "Title", dataIndex: "bookTitle", key: "bookTitle", ellipsis: true },
      {
        title: "Due date",
        dataIndex: "dueDate",
        key: "dueDate",
        width: 160,
        render: (v) => fmt(v),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (s) => <StatusTag s={s} />,
      },
    ],
    []
  );

  // Bảng chính: các batch
  const columns = useMemo(
    () => [
      {
        title: "User",
        key: "user",
        render: (_, r) => r.userName || r.user?.name || r.userId || "-",
        width: 220,
      },
      {
        title: "Batch",
        dataIndex: "batchId",
        key: "batchId",
        width: 220,
        render: (v) => <Typography.Text code>{v}</Typography.Text>,
      },
      {
        title: "Items",
        key: "items",
        width: 100,
        align: "right",
        render: (_, r) => r.loanCount ?? r.totalBooks ?? (r.loans?.length ?? 0),
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 170,
        render: (v) => fmt(v),
      },
      {
        title: "Expires",
        dataIndex: "expiresAt",
        key: "expiresAt",
        width: 170,
        render: (v) => fmt(v),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (s) => <StatusTag s={s} />,
      },
      {
        title: "Action",
        key: "action",
        width: 190,
        render: (_, r) => (
          <Space>
            <Popconfirm
              title="Huỷ phiếu giữ sách?"
              description="Sách sẽ được trả về tồn kho"
              okText="Huỷ phiếu"
              okButtonProps={{ danger: true }}
              onConfirm={async () => {
                try {
                  await cancelHold({ batchId: r.batchId }).unwrap();
                  message.success("Đã huỷ phiếu");
                  refetch();
                } catch (e) {
                  message.error(e?.data?.message || "Huỷ thất bại");
                }
              }}
            >
              <Button danger size="small" disabled={r.status !== "ChoNhan"} loading={loadingCancel}>
                Cancel
              </Button>
            </Popconfirm>
            {/* Nút xác nhận thủ công nếu không dùng máy quét */}
            <Button
              size="small"
              type="primary"
              onClick={async () => {
                try {
                  // BE có thể hỗ trợ /confirm-by-batchId; nếu không, bỏ nút này.
                  // Ở đây demo: yêu cầu người dùng quét/nhập mã (khuyến nghị dùng input Scan)
                  message.info("Vui lòng dùng ô Scan code để xác nhận (QR/Short Code).");
                } catch {
                  /* noop */
                }
              }}
              disabled={r.status !== "ChoNhan"}
            >
              Confirm
            </Button>
          </Space>
        ),
      },
    ],
    [cancelHold, loadingCancel, message, refetch]
  );

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 12 }}>
        <Space style={{ width: "100%", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Loans / Holds
            </Typography.Title>
            <Typography.Text type="secondary">Quản lý phiếu đặt & xác nhận nhận sách tại quầy</Typography.Text>
          </div>

          <Space align="center">
            <Segmented
              value={status}
              onChange={(v) => {
                setStatus(String(v));
                setPage(1);
              }}
              options={[
                { label: "Chờ nhận", value: "ChoNhan" },
                { label: "Đang mượn", value: "DangMuon" },
                { label: "Đã trả", value: "DaTra" },
                { label: "Đã huỷ", value: "Huy" },
              ]}
            />

            <Input.Search
              allowClear
              placeholder="Tìm user/batch…"
              style={{ width: 240 }}
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onSearch={(v) => {
                setQ(v.trim());
                setPage(1);
              }}
            />
          </Space>
        </Space>
      </div>

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <Input
          ref={scanRef}
          value={scanValue}
          onChange={(e) => setScanValue(e.target.value)}
          onPressEnter={() => handleScanConfirm(scanValue)}
          placeholder="Đưa mã vào máy quét & Enter… (VD: B7D8-692B hoặc QR token)"
          allowClear
          style={{ width: 420 }}
        />
        <Button
          type="primary"
          onClick={() => handleScanConfirm(scanValue)}
          loading={loadingShort || loadingQr}
        >
          Confirm
        </Button>
      </div>

      <Table
        rowKey={(r) => r.batchId}
        loading={isFetching}
        dataSource={data?.items || []}
        columns={columns}
        expandable={{
          expandedRowRender: (r) => (
            <Table
              size="small"
              rowKey={(x) => x.loanId || x._id || `${r.batchId}-${x.bookId}`}
              dataSource={r.loans || []}
              columns={loanColumns}
              pagination={false}
            />
          ),
          rowExpandable: (r) => Array.isArray(r.loans) && r.loans.length > 0,
        }}
        pagination={{
          current: data?.page || page,
          pageSize: data?.pageSize || pageSize,
          total: data?.total || 0,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
            requestAnimationFrame(() => scanRef.current?.focus());
          },
        }}
      />
    </div>
  );
}
