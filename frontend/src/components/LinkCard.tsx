import {
  Button,
  Card,
  Col,
  Descriptions,
  Typography,
  Row,
  Space,
  Tooltip,
} from 'antd/lib';
import React from 'react';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  QrcodeOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { LinkInfo } from './LinkInfo';

export default function LinkCard({ linkInfo }: { linkInfo: LinkInfo }) {
  const onCopyOriginalLink = () => {
    navigator.clipboard.writeText(linkInfo.long_url);
  };

  return (
    <Card
      title={linkInfo.title}
      extra={
        <Space>
          <Tooltip title="View link details">
            <Button
              icon={<EyeOutlined />}
              type="text"
              href={`/app/links/${linkInfo.id}`}
              target="_blank"
            />
          </Tooltip>
          <Tooltip title="Edit link">
            <Button
              icon={<EditOutlined />}
              type="text"
              href={`/app/links/${linkInfo.id}?mode=edit`}
              target="_blank"
            />
          </Tooltip>
          <Tooltip title="Share link permissions">
            <Button
              icon={<TeamOutlined />}
              type="text"
              href={`/app/links/${linkInfo.id}?mode=collaborate`}
              target="_blank"
            />
          </Tooltip>
          <Tooltip title="Access qr code">
            <Button
              icon={<QrcodeOutlined />}
              type="text"
              href={`/app/links/${linkInfo.id}?mode=qrcode`}
              target="_blank"
            />
          </Tooltip>
          <Tooltip title="Delete link">
            <Button
              icon={<DeleteOutlined />}
              type="text"
              danger
              disabled={linkInfo.deletion_info !== null}
              href={`/app/links/${linkInfo.id}?mode=edit`}
              target="_blank"
            />
          </Tooltip>
        </Space>
      }
    >
      <Card.Grid style={{ width: '100%' }} hoverable={false}>
        <Descriptions
          column={5}
          colon={false}
          items={[
            {
              key: 'created_by',
              label: 'Owner',
              children: linkInfo.owner,
            },
            {
              key: 'unique_visits',
              label: 'Unique Visits',
              children: linkInfo.unique_visits,
            },
            {
              key: 'total_visits',
              label: 'Total Visits',
              children: linkInfo.visits,
            },
            {
              key: 'date_created',
              label: 'Date Created',
              children: dayjs(linkInfo.created_time).format(
                'MMM D, YYYY - h:mm A',
              ),
            },
            {
              key: 'date_expires',
              label: 'Date Expires',
              children:
                linkInfo.expiration_time === null
                  ? 'N/A'
                  : dayjs(linkInfo.expiration_time).format(
                      'MMM D, YYYY - h:mm A',
                    ),
            },
          ]}
        />
      </Card.Grid>
      <Card.Grid style={{ width: '100%' }} hoverable={false}>
        <Row gutter={16} justify="space-between" align="middle">
          <Col>
            <Row gutter={[16, 16]}>
              {linkInfo.aliases.map((alias) => (
                <Col span={24}>
                  <Tooltip title="Copy to clipboard">
                    <Button
                      icon={<CopyOutlined />}
                      type="dashed"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${document.location.host}/${alias.alias}`,
                        );
                      }}
                    >
                      {document.location.host}/{alias.alias}
                    </Button>
                  </Tooltip>
                </Col>
              ))}
            </Row>
          </Col>
          <Col>
            <Tooltip title="Copy to clipboard">
              <Button
                className="tw-max-w-96"
                icon={<CopyOutlined />}
                type="dashed"
                onClick={onCopyOriginalLink}
              >
                <Typography.Text ellipsis>{linkInfo.long_url}</Typography.Text>
              </Button>
            </Tooltip>
          </Col>
        </Row>
      </Card.Grid>
    </Card>
  );
}
