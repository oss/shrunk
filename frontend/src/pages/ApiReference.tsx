/**
 * Implements the [[ApiReference]] component
 */
import React from 'react';
import {
  Collapse,
  CollapseProps,
  Typography,
  Flex,
  Descriptions,
  Divider,
  Row,
  Col,
} from 'antd/lib';

export default function ApiReference() {
  const items: CollapseProps['items'] = [
    {
      key: '1',
      label: 'GET /users',
      children: (
        <Typography>
          <Typography.Title level={4}>List all Users</Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Returns all the Users registered on Shrunk
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono">
              {`curl https://shrunk.rutgers.edu/api/v1/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY"`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="!tw-mt-4">
            Response
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-border tw-bg-[#f5f5f5] tw-p-8 tw-font-mono">
              {`{
    "netid": str,
    "organizations": [str, ...],
    "roles": [str, ...],
    "linksCreated": int,
}`}
            </Flex>
            <Typography.Title className="!tw-mt-4" level={5}>
              Query Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>roles</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Filter users by roles.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="tw-my-2 !tw-mt-4" />
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>filter</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Only return specified fields in response (comma-separated).
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
  ];
  return (
    <>
      <Typography>
        <Typography.Title level={2} className="!tw-mt-4">
          Introduction
        </Typography.Title>
        <Typography.Text className="!tw-mt-4">
          This API reference describes the APIs you can use to interact with
          Shrunk. If you have any questions, please email us{' '}
          <Typography.Link
            href="mailto:oss@oss.rutgers.edu"
            target="_blank"
            className="!tw-underline"
          >
            oss@oss.rutgers.edu
          </Typography.Link>
          .
        </Typography.Text>
        <Typography.Title level={2} className="!tw-mt-4">
          Authentication
        </Typography.Title>
        <Typography.Paragraph className="!tw-mt-0">
          The Shrunk API uses API keys for authentication. Create, manage, and
          learn more about API keys in your{' '}
          <Typography.Link
            className="!tw-underline"
            href="https://shrunk.rutgers.edu/app/orgs"
            target="_blank"
          >
            organization managment page
          </Typography.Link>
          .
        </Typography.Paragraph>
        <Typography.Paragraph>
          Authentication is performed via Bearer tokens.
        </Typography.Paragraph>
        <Typography.Paragraph code>
          {' '}
          Authorization: Bearer SHRUNK_API_KEY
        </Typography.Paragraph>
        <Typography.Paragraph>API Base URL:</Typography.Paragraph>
        <Typography.Link
          href="https://shrunk.rutgers.edu/api/v1"
          target="_blank"
        >
          https://shrunk.rutgers.edu/api/v1
        </Typography.Link>
        .
        <Collapse className="!tw-mt-4" items={items} />
      </Typography>
    </>
  );
}
