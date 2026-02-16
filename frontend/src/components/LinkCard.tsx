import {
  Button,
  Card,
  Col,
  Descriptions,
  Typography,
  Row,
  Space,
  Tooltip,
} from 'antd';
import React from 'react';
import dayjs from 'dayjs';
import {
  CopyIcon,
  EditIcon,
  EyeIcon,
  QrCodeIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react';

import { Link } from '@/interfaces/link';
import { getRedirectFromAlias } from '@/lib/utils';

export default function LinkCard({ linkInfo }: { linkInfo: Link }) {
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
              icon={<EyeIcon />}
              type="text"
              href={`/app/links/${linkInfo._id}`}
              target="_blank"
            />
          </Tooltip>
          <Tooltip title="Edit link">
            <Button
              icon={<EditIcon />}
              type="text"
              href={`/app/links/${linkInfo._id}?mode=edit`}
              target="_blank"
            />
          </Tooltip>
          <Tooltip title="Share link permissions">
            <Button
              icon={<UsersIcon />}
              type="text"
              href={`/app/links/${linkInfo._id}?mode=collaborate`}
              target="_blank"
            />
          </Tooltip>
          <Tooltip title="Access qr code">
            <Button
              icon={<QrCodeIcon />}
              type="text"
              href={`/app/links/${linkInfo._id}?mode=qrcode`}
              target="_blank"
            />
          </Tooltip>
          <Tooltip title="Delete link">
            <Button
              icon={<Trash2Icon />}
              type="text"
              danger
              disabled={linkInfo.deletion_info !== null}
              href={`/app/links/${linkInfo._id}?mode=edit`}
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
              children:
                linkInfo.owner.type === 'netid' ? (
                  linkInfo.owner._id
                ) : (
                  <a href={`/app/orgs/${linkInfo.owner._id}`}>
                    {linkInfo.owner.org_name}
                  </a>
                ),
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
              <Col span={24}>
                <Tooltip title="Copy to clipboard">
                  <Button
                    icon={<CopyIcon />}
                    type="dashed"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        getRedirectFromAlias(
                          linkInfo.alias,
                          linkInfo.is_tracking_pixel_link,
                        ),
                      );
                    }}
                  >
                    {getRedirectFromAlias(
                      linkInfo.alias,
                      linkInfo.is_tracking_pixel_link,
                    )}
                  </Button>
                </Tooltip>
              </Col>
            </Row>
          </Col>
          <Col>
            {!linkInfo.is_tracking_pixel_link && (
              <Tooltip title="Copy to clipboard">
                <Button
                  className="tw-max-w-96"
                  icon={<CopyIcon />}
                  type="dashed"
                  onClick={onCopyOriginalLink}
                >
                  <Typography.Text ellipsis>
                    {linkInfo.long_url}
                  </Typography.Text>
                </Button>
              </Tooltip>
            )}
          </Col>
        </Row>
      </Card.Grid>
    </Card>
  );
}
