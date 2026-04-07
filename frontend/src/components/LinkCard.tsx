import React from 'react';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Typography,
  Row,
  Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import { CopyIcon, EditIcon, EyeIcon } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

import { Link } from '@/interfaces/link';
import { getRedirectFromAlias } from '@/lib/utils';

export default function LinkCard({ linkInfo }: { linkInfo: Link }) {
  const onCopyOriginalLink = () => {
    navigator.clipboard.writeText(linkInfo.long_url);
  };

  return (
    <Card
      title={linkInfo.title}
      extra={[
        <Tooltip key="edit" title="Edit link">
          <Button
            icon={<EditIcon />}
            type="text"
            href={`/app/links/${linkInfo._id}?mode=edit`}
            target="_blank"
            className="!tw-inline-flex !tw-items-center !tw-justify-center"
          />
        </Tooltip>,
        <Tooltip key="view" title="View link">
          <Button
            icon={<EyeIcon />}
            type="text"
            href={`/app/links/${linkInfo._id}`}
            target="_blank"
            className="!tw-inline-flex !tw-items-center !tw-justify-center"
          />
        </Tooltip>,
      ]}
    >
      <Card.Grid
        className="xl:tw-hidden"
        style={{ width: '100%' }}
        hoverable={false}
      >
        <Descriptions
          layout="vertical"
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
      <Card.Grid
        className="tw-hidden xl:tw-block"
        style={{ width: '100%' }}
        hoverable={false}
      >
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
                  <RouterLink to={`/app/orgs/${linkInfo.owner._id}`}>
                    {linkInfo.owner.org_name}
                  </RouterLink>
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
