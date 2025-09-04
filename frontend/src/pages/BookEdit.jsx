import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card, Form, Input, InputNumber, Select, Upload, Tabs, Row, Col, Space,
  Typography, Button, message, Skeleton
} from "antd";
import { InboxOutlined, ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useGetBookQuery, useUpdateBookMutation } from "@/services/booksApi";
import { useListAuthorsQuery, useListPublishersQuery, useListCategoriesQuery } from "@/services/refDataApi";
import { useSelector } from "react-redux";

const { Dragger } = Upload;
const { TextArea } = Input;

export default function BookEdit() {
  const { id } = useParams();            // bookId
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { data: book, isFetching } = useGetBookQuery(id);
  const [updateBook, { isLoading: saving }] = useUpdateBookMutation();

  // dropdown data
  const { data: authorsData, isFetching: loadingAuthors } = useListAuthorsQuery({ limit: 200 });
  const { data: pubsData,     isFetching: loadingPublishers } = useListPublishersQuery({ limit: 200 });
  const { data: catsData,     isFetching: loadingCategories } = useListCategoriesQuery({ limit: 200 });

  const authorOptions = useMemo(() => (authorsData?.items ?? []).map(a => ({ value: a.authorId, label: a.name })), [authorsData]);
  const publisherOptions = useMemo(() => (pubsData?.items ?? []).map(p => ({ value: p.publisherId, label: p.name })), [pubsData]);
  const categoryOptions = useMemo(() => (catsData?.items ?? []).map(c => ({ value: c.categoryId, label: c.name })), [catsData]);

  // upload
  const token = useSelector((s) => s.auth.token);
  const uploadAction = `${import.meta.env.VITE_API_BASE_URL}/upload/book-cover`;

  // set initial form values khi có book
  useEffect(() => {
    if (book) {
      form.setFieldsValue({
        title: book.title,
        isbn: book.isbn,
        year: book.year,
        language: book.language,
        description: book.description,
        authorId: book.authorId,
        publisherId: book.publisherId,
        categoryId: book.categoryId,
        quantity: book.quantity,
        available: book.available,
        location: book.location,
        coverImage: book.coverImage,
      });
    }
  }, [book, form]);

  const onSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        year: values.year ?? undefined,
      };
      await updateBook({ id, data: payload }).unwrap();
      message.success("Updated");
      navigate(`/books/${id}`);
    } catch (err) {
      if (err?.errorFields) return; // form invalid
      message.error(err?.data?.message || "Update failed");
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
          <Typography.Title level={3} style={{ margin: 0 }}>Edit Book</Typography.Title>
          <Typography.Text type="secondary">#{id}</Typography.Text>
        </Space>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>
          Save
        </Button>
      </div>

      <Card>
        {isFetching ? (
          <Skeleton active />
        ) : (
          <Form form={form} layout="vertical">
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
                        <Form.Item
                          name="year"
                          label="Year"
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
                        <Form.Item name="authorId" label="Author" rules={[{ required: true }]}>
                          <Select
                            showSearch allowClear placeholder="Select author"
                            loading={loadingAuthors} options={authorOptions}
                            filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="publisherId" label="Publisher" rules={[{ required: true }]}>
                          <Select
                            showSearch allowClear placeholder="Select publisher"
                            loading={loadingPublishers} options={publisherOptions}
                            filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
                          <Select
                            showSearch allowClear placeholder="Select category"
                            loading={loadingCategories} options={categoryOptions}
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
                            () => ({
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
                      {/* giữ URL trong form */}
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
                          // hiển thị ảnh cũ nếu có
                          defaultFileList={
                            book?.coverImage
                              ? [{ uid: "-1", name: "cover", status: "done", url: book.coverImage }]
                              : []
                          }
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
        )}
      </Card>
    </div>
  );
}
