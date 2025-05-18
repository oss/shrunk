import {
  Button,
  Card,
  Col,
  Descriptions,
  Typography,
  Row,
  Space,
  Tooltip,
  Tag,
} from 'antd/lib';
import React from 'react';
import dayjs from 'dayjs';
import { BadgeAlertIcon, CopyIcon, Trash2Icon } from 'lucide-react';
import { AccessTokenData } from '../interfaces/access-token';

export default function AccessTokenCard({
  accessTokenData,
}: {
  accessTokenData: AccessTokenData;
}) {
  return (
    <Card
      title={accessTokenData.title}
      extra={
        <Space>
          <Tooltip title="Disable">
            <Button
              icon={<BadgeAlertIcon />}
              type="text"
              danger
              disabled={accessTokenData.disabled}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              icon={<Trash2Icon />}
              type="text"
              danger
              disabled={accessTokenData.deleted}
            />
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
