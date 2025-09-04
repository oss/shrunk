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
  const apiUrl = `${window.location.origin}/api/v1`;
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
              {`curl ${apiUrl}/users \\
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
    "users": [
      {
        "netid": str,
        "organizations": [str, ...],
        "roles": [str, ...],
        "linksCreated": int,
      }
    ]
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
    {
      key: 'links-post',
      label: 'POST /links',
      children: (
        <Typography>
          <Typography.Title level={4}>Create Link</Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Creates a short link within an organization
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono">
              {`curl ${apiUrl}/links \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY" \\
  -d '{
    "title": "My Link",
    "long_url": "https://example.com",
    "alias": "exampl",
    "expiration_time": "2025-12-31T23:59:59Z",
    "organization_id": "<org_id>"
  }'`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="!tw-mt-4">
            Response
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-border tw-bg-[#f5f5f5] tw-p-8 tw-font-mono">
              {`{
  "id": str,
  "alias": str
}`}
            </Flex>
            <Typography.Title className="!tw-mt-4" level={5}>
              Body Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>organization_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                The organization to create the link in. Must match the
                token&apos;s organization.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="tw-my-2 !tw-mt-4" />
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>long_url</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Destination URL for the short link.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="tw-my-2 !tw-mt-4" />
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>title</Typography.Text>
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
                Human-friendly name for the link. Defaults to &quot;Untitled
                Link&quot;.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="tw-my-2 !tw-mt-4" />
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>alias</Typography.Text>
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
                Custom short code (min length 5). If omitted, one is generated.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="tw-my-2 !tw-mt-4" />
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>expiration_time</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        string (ISO 8601)
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                When the link should expire. Example: 2025-12-31T23:59:59Z
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'links-get',
      label: 'GET /links/<org_id>/<link_id>',
      children: (
        <Typography>
          <Typography.Title level={4}>Get Link</Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Retrieves a link by organization and link ID
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono">
              {`curl ${apiUrl}/links/<org_id>/<link_id> \\
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
  "_id": str,
  "title": str,
  "long_url": str,
  "owner": { "_id": str, "org_name": str, "type": "org" },
  "created_time": str,
  "expiration_time": str | null,
  "domain": str | null,
  "alias": str,
  "deleted": bool,
  "deletion_info": { "deleted_by": str | null, "delete_time": str | null },
  "editors": [str, ...],
  "viewers": [str, ...],
  "is_tracking_pixel_link": false
}`}
            </Flex>
            <Typography.Title className="!tw-mt-4" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>org_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Organization ID owning the link.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="tw-my-2 !tw-mt-4" />
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>link_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                ID of the link to retrieve.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'links-list',
      label: 'GET /links/<org_id>',
      children: (
        <Typography>
          <Typography.Title level={4}>List Organization Links</Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Returns all links owned by an organization
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono">
              {`curl ${apiUrl}/links/<org_id> \\
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
  "links": [
    {
      "_id": str,
      "title": str,
      "long_url": str,
      "owner": { "_id": str, "org_name": str, "type": "org" },
      "created_time": str,
      "expiration_time": str | null,
      "domain": str | null,
      "alias": str,
      "deleted": bool,
      "deletion_info": { "deleted_by": str | null, "delete_time": str | null },
      "editors": [str, ...],
      "viewers": [str, ...],
      "is_tracking_pixel_link": false
    }
  ]
}`}
            </Flex>
            <Typography.Title className="!tw-mt-4" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>org_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Organization ID whose links to list. Must match the token&apos;s
                organization.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'pixels-post',
      label: 'POST /tracking-pixels',
      children: (
        <Typography>
          <Typography.Title level={4}>Create Tracking Pixel</Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Creates a tracking pixel link within an organization
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono">
              {`curl ${apiUrl}/tracking-pixels \\
  -X POST \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $SHRUNK_API_KEY" \\
  -d '{
    "title": "Newsletter Pixel",
    "tracking_pixel_extension": ".png",
    "organization_id": "<org_id>"
  }'`}
            </Flex>
          </Typography>
          <Typography.Paragraph className="!tw-mt-4">
            Response
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-border tw-bg-[#f5f5f5] tw-p-8 tw-font-mono">
              {`{
  "id": str,
  "alias": str
}`}
            </Flex>
            <Typography.Title className="!tw-mt-4" level={5}>
              Body Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>organization_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                The organization to create the tracking pixel in. Must match the
                token&apos;s organization.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="tw-my-2 !tw-mt-4" />
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>title</Typography.Text>
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
                Human-friendly name for the tracking pixel. Defaults to
                &quot;Untitled Link&quot;.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="tw-my-2 !tw-mt-4" />
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>
                        tracking_pixel_extension
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        string (&quot;.png&quot; | &quot;.gif&quot;)
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Optional
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                File format for the pixel image. Defaults to .png.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'pixels-get',
      label: 'GET /tracking-pixels/<org_id>/<link_id>',
      children: (
        <Typography>
          <Typography.Title level={4}>Get Tracking Pixel</Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Retrieves a tracking pixel link by organization and link ID
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono">
              {`curl ${apiUrl}/tracking-pixels/<org_id>/<link_id> \\
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
  "_id": str,
  "title": str,
  "long_url": str,
  "owner": { "_id": str, "org_name": str, "type": "org" },
  "created_time": str,
  "expiration_time": str | null,
  "domain": str | null,
  "alias": str,
  "deleted": bool,
  "deletion_info": { "deleted_by": str | null, "delete_time": str | null },
  "editors": [str, ...],
  "viewers": [str, ...],
  "is_tracking_pixel_link": true
}`}
            </Flex>
            <Typography.Title className="!tw-mt-4" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>org_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Organization ID owning the tracking pixel link.
              </Descriptions.Item>
            </Descriptions>
            <Divider className="tw-my-2 !tw-mt-4" />
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>link_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                ID of the tracking pixel link to retrieve.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'pixels-list',
      label: 'GET /tracking-pixels/<org_id>',
      children: (
        <Typography>
          <Typography.Title level={4}>
            List Organization Tracking Pixels
          </Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Returns all tracking pixel links owned by an organization
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono">
              {`curl ${apiUrl}/tracking-pixels/<org_id> \\
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
  "tracking-pixels": [
    {
      "_id": str,
      "title": str,
      "long_url": str,
      "owner": { "_id": str, "org_name": str, "type": "org" },
      "created_time": str,
      "expiration_time": str | null,
      "domain": str | null,
      "alias": str,
      "deleted": bool,
      "deletion_info": { "deleted_by": str | null, "delete_time": str | null },
      "editors": [str, ...],
      "viewers": [str, ...],
      "is_tracking_pixel_link": true
    }
  ]
}`}
            </Flex>
            <Typography.Title className="!tw-mt-4" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>org_id</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                Organization ID whose tracking pixel links to list. Must match
                the token&apos;s organization.
              </Descriptions.Item>
            </Descriptions>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'orgs-list',
      label: 'GET /organizations',
      children: (
        <Typography>
          <Typography.Title level={4}>List All Organizations</Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Returns all organizations
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono">
              {`curl ${apiUrl}/organizations \\
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
  "organizations": [
    {
      "_id": str,
      "name": str,
      "members": [str, ...]
    }
  ]
}`}
            </Flex>
          </Typography>
        </Typography>
      ),
    },
    {
      key: 'orgs-get-netid',
      label: 'GET /organizations/<netid>',
      children: (
        <Typography>
          <Typography.Title level={4}>
            List Organizations By NetID
          </Typography.Title>
          <Typography.Title className="!tw-mt-4" level={5}>
            Returns all organizations a user is a member of
          </Typography.Title>
          <Typography.Paragraph className="!tw-mt-4">
            Request
          </Typography.Paragraph>
          <Typography className="!tw-mt-4">
            <Flex className="tw-overflow-x-auto tw-whitespace-pre tw-rounded-[4px] tw-bg-[#f5f5f5] tw-p-6 tw-font-mono">
              {`curl ${apiUrl}/organizations/<netid> \\
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
  "organizations": [
    {
      "_id": str,
      "name": str,
    }
  ]
}`}
            </Flex>
            <Typography.Title className="!tw-mt-4" level={5}>
              Path Parameters
            </Typography.Title>
            <Descriptions column={1} bordered={false} className="!tw-mt-4">
              <Descriptions.Item
                label={
                  <Row gutter={8} align="middle" wrap={false}>
                    <Col>
                      <Typography.Text code>netid</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">string</Typography.Text>
                    </Col>
                    <Col>
                      <Typography.Text type="secondary">
                        Required
                      </Typography.Text>
                    </Col>
                  </Row>
                }
              >
                NetID of the user whose organizations to list.
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
            href={`${window.location.origin}/app/orgs`}
            target="_blank"
          >
            organization managment page
          </Typography.Link>{' '}
          or the{' '}
          <Typography.Link
            className="!tw-underline"
            href={`${window.location.origin}/app/admin?tab=super-tokens`}
            target="_blank"
          >
            admin dashboard
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
        <Typography.Link href={apiUrl} target="_blank">
          {`${window.location.origin}/api/v1`}
        </Typography.Link>
        .
        <Collapse className="!tw-mt-4" items={items} />
      </Typography>
    </>
  );
}
