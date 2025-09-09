// src/components/loans/ConfirmPickupModal.jsx
import { App as AntdApp, Modal, Form, Input } from "antd";
import { useConfirmByShortCodeMutation } from "@/services/loansApi";

export default function ConfirmPickupModal({ open, onClose }) {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm();
  const [confirmByShortCode, { isLoading }] = useConfirmByShortCodeMutation();

  const onSubmit = async () => {
    try {
      const { shortCode, batchId } = await form.validateFields();
      await confirmByShortCode({ shortCode: shortCode.trim(), batchId: batchId?.trim() }).unwrap();
      message.success("Xác nhận nhận sách thành công");
      onClose(true);
    } catch (e) {
      if (e?.errorFields) return;
      message.error(e?.data?.message || "Xác nhận thất bại");
    }
  };

  return (
    <Modal
      title="Xác nhận nhận sách (mã ngắn)"
      open={open}
      onCancel={() => onClose(false)}
      onOk={onSubmit}
      okButtonProps={{ loading: isLoading }}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="shortCode"
          label="Short code"
          rules={[{ required: true, message: "Nhập mã ngắn từ app SV" }]}
        >
          <Input placeholder="Ví dụ: B7D8-692B" />
        </Form.Item>

        {/* Nếu BE cần batchId (tuỳ triển khai), bật field này.
            Còn nếu BE chỉ cần shortCode là đủ -> có thể xoá field batchId */}
        <Form.Item name="batchId" label="Batch ID (tuỳ chọn)">
          <Input placeholder="Nếu cần đính kèm batchId" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
