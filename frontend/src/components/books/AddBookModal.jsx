import { useMemo, useState } from "react";
import {
  Modal, Form, Input, InputNumber, Select, Upload, Tabs,
  Row, Col, message
} from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useCreateBookMutation } from "@/services/booksApi";
import {
  useListAuthorsQuery,
  useListPublishersQuery,
  useListCategoriesQuery
} from "@/services/refDataApi";

const { Dragger } = Upload;
const { TextArea } = Input;

export default function AddBookModal({ open, onClose, onCreated }) {
  const [form] = Form.useForm();
  const token = useSelector((s) => s.auth.token);
  const uploadAction = `${import.meta.env.VITE_API_BASE_URL}/upload/book-cover`;

  // Chỉ nạp dropdown khi modal mở
  const { data: authorsData, isFetching: loadingAuthors } =
    useListAuthorsQuery({ limit: 100 }, { skip: !open });
  const { data: pubsData, isFetching: loadingPublishers } =
    useListPublishersQuery({ limit: 100 }, { skip: !open });
  const { data: catsData, isFetching: loadingCategories } =
    useListCategoriesQuery({ limit: 100 }, { skip: !open });

  const authorOptions = useMemo(
    () => (authorsData?.items ?? []).map(a => ({ value: a.authorId, label: a.name })),
    [authorsData]
  );
  const publisherOptions = useMemo(
    () => (pubsData?.items ?? []).map(p => ({ value: p.publisherId, label: p.name })),
    [pubsData]
  );
  const categoryOptions = useMemo(
    () => (catsData?.items ?? []).map(c => ({ value: c.categoryId, label: c.name })),
    [catsData]
  );

  const [createBook, { isLoading }] = useCreateBookMutation();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        year: values.year ?? undefined
      };
      await createBook(payload).unwrap();
      message.success("Book created");
      form.resetFields();
      onCreated?.();   // gợi ý: parent refetch
      onClose?.();
    } catch (err) {
      if (err?.errorFields) return; // form invalid
      message.error(err?.data?.message || "Create failed");
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose?.();
  };

  return (
    <Modal
      title="Add Book"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okButtonProps={{ loading: isLoading }}
      destroyOnHidden
      width={760}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          quantity: 1,
          available: 1,
          language: "",
          description: "Không có mô tả"
        }}
      >
        <Tabs
          defaultActiveKey="basic"
          items={[
            {
              key: "basic",
              label: "Information",
              children: (
                <Row gutter={16}>
                  <Col span={16}>
                    <Form.Item
                      name="title"
                      label="Title"
                      rules={[{ required: true, message: "Please input title" }]}
                    >
                      <Input placeholder="Book title" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="year" label="Year"
                      rules={[
                        ({ getFieldValue }) => ({
                          validator(_, val) {
                            if (val == null || (Number.isInteger(val) && val >= 0 && val <= 3000)) return Promise.resolve();
                            return Promise.reject(new Error("Year must be an integer (0–3000)"));
                          }
                        })
                      ]}
                    >
                      <InputNumber style={{ width: "100%" }} placeholder="e.g. 2020" />
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item name="isbn" label="ISBN">
                      <Input placeholder="ISBN" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="language" label="Language">
                      <Input placeholder="e.g. English / Tiếng Việt" />
                    </Form.Item>
                  </Col>

                  <Col span={24}>
                    <Form.Item name="description" label="Description">
                      <TextArea rows={3} placeholder="Short description" />
                    </Form.Item>
                  </Col>
                </Row>
              )
            },
            {
              key: "classify",
              label: "Classification",
              children: (
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="authorId"
                      label="Author"
                      rules={[{ required: true, message: "Please select author" }]}
                    >
                      <Select
                        showSearch
                        allowClear
                        loading={loadingAuthors}
                        options={authorOptions}
                        placeholder="Select author"
                        filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="publisherId"
                      label="Publisher"
                      rules={[{ required: true, message: "Please select publisher" }]}
                    >
                      <Select
                        showSearch
                        allowClear
                        loading={loadingPublishers}
                        options={publisherOptions}
                        placeholder="Select publisher"
                        filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="categoryId"
                      label="Category"
                      rules={[{ required: true, message: "Please select category" }]}
                    >
                      <Select
                        showSearch
                        allowClear
                        loading={loadingCategories}
                        options={categoryOptions}
                        placeholder="Select category"
                        filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )
            },
            {
              key: "inventory",
              label: "Inventory",
              children: (
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="quantity"
                      label="Quantity"
                      rules={[
                        { required: true, message: "Required" },
                        ({ getFieldValue }) => ({
                          validator(_, val) {
                            if (Number.isInteger(val) && val >= 0) return Promise.resolve();
                            return Promise.reject(new Error("Quantity must be an integer ≥ 0"));
                          }
                        })
                      ]}
                    >
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="available"
                      label="Available"
                      rules={[
                        { required: true, message: "Required" },
                        ({ getFieldValue }) => ({
                          validator(_, val) {
                            const qty = getFieldValue("quantity");
                            if (Number.isInteger(val) && val >= 0 && (qty == null || val <= qty)) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error("Available must be ≤ Quantity and ≥ 0"));
                          }
                        })
                      ]}
                    >
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name="location" label="Location">
                      <Input placeholder="Kệ D1 - Tầng 2" />
                    </Form.Item>
                  </Col>
                </Row>
              )
            },
            {
              key: "media",
              label: "Media",
              children: (
                <>
                  {/* Hidden field lưu URL sau upload */}
                  <Form.Item name="coverImage" hidden>
                    <Input />
                  </Form.Item>

                  <Form.Item label="Cover image">
                    <Dragger
                      name="file"
                      multiple={false}
                      action={uploadAction}
                      headers={token ? { Authorization: `Bearer ${token}` } : {}}
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                      maxCount={1}
                      onChange={({ file }) => {
                        if (file.status === "done") {
                          const url = file.response?.url;
                          form.setFieldsValue({ coverImage: url });
                          message.success("Uploaded cover");
                        } else if (file.status === "error") {
                          message.error(file.response?.message || "Upload failed");
                        }
                      }}
                      onRemove={() => form.setFieldsValue({ coverImage: "" })}
                    >
                      <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                      <p className="ant-upload-text">Click or drag image to upload</p>
                      <p className="ant-upload-hint">PNG/JPG/WebP/GIF · max 5MB</p>
                    </Dragger>
                  </Form.Item>
                </>
              )
            }
          ]}
        />
      </Form>
    </Modal>
  );
}
