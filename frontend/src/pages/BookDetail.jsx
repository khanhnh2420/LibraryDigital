import { useParams } from "react-router-dom";
import { useGetBookQuery } from "@/services/booksApi";
import { Card, Descriptions, Typography } from "antd";

export default function BookDetail() {
  const { id } = useParams();
  const { data, isFetching } = useGetBookQuery(id);

  return (
    <div>
      <div className="page-header">
        <Typography.Title level={3} style={{ margin: 0 }}>Book Detail</Typography.Title>
        <Typography.Text className="text-dim">#{id}</Typography.Text>
      </div>
      <Card loading={isFetching}>
        {data && (
          <Descriptions bordered column={1} size="middle">
            <Descriptions.Item label="Title">{data.title}</Descriptions.Item>
            <Descriptions.Item label="Author">{(data.author && data.author.name) || "-"}</Descriptions.Item>
            <Descriptions.Item label="Year">{data.year || "-"}</Descriptions.Item>
            <Descriptions.Item label="ISBN">{data.isbn || "-"}</Descriptions.Item>
            <Descriptions.Item label="Language">{data.language || "-"}</Descriptions.Item>
            <Descriptions.Item label="Description">{data.description || "-"}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </div>
  );
}
