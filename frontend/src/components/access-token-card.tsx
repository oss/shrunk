import {
  Button,
  Card,
  Descriptions,
  Typography,
  Space,
  Tooltip,
  Tag,
  Popconfirm,
  message,
} from 'antd/lib';
import React from 'react';
import dayjs from 'dayjs';
import { Trash2Icon } from 'lucide-react';
import { AccessTokenData } from '../interfaces/access-token';
import { deleteToken } from '../api/organization';

export default function AccessTokenCard({
  accessTokenData,
}: {
  accessTokenData: AccessTokenData;
}) {
  const onDeleteToken = async (id: string) => {
    await deleteToken(id);
  };

  return (
    <Card
      title={accessTokenData.title}
      extra={
        <Space>
          <Tooltip title="Delete">
            <Popconfirm
              title="Are you sure you want to delete this organization?"
              onConfirm={async () => {
                try {
                  await onDeleteToken(accessTokenData.id);
                  message.success('Token deleted successfully');
                } catch (error) {
                  message.error('Failed to delete Token');
                }
              }}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                icon={<Trash2Icon />}
                type="text"
                danger
                disabled={accessTokenData.deleted}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      }
    >
      <Card.Grid style={{ width: '100%' }} hoverable={false}>
        <Typography.Paragraph>
          {accessTokenData.description}
        </Typography.Paragraph>
        <Descriptions
          column={2}
          colon={false}
          items={[
            {
              key: 'permissions',
              label: 'Permissions',
              span: 2,
              children: accessTokenData.permissions.map(
                (permission: string) => (
                  <Tag key={permission}>{permission}</Tag>
                ),
              ),
            },
            {
              key: 'created_by',
              label: 'Creator',
              children: accessTokenData.created_by,
            },
            {
              key: 'date_created',
              label: 'Date Created',
              children: dayjs(accessTokenData.created_date).format(
                'MMM D, YYYY - h:mm A',
              ),
            },
          ]}
        />
      </Card.Grid>
    </Card>
  );
}
