import { Row, Col, Typography, Collapse, Button, Space } from 'antd';
import React from 'react';

export default function Developer() {
  return (
    <>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Typography.Title level={2}>
            Automate Shortening Links for Rutgers University
          </Typography.Title>
          <Typography.Paragraph>
            From shortening links to creating qr codes, you can leverage our
            APIs to avoid paying for services like Bitly or TinyURL. All
            automated links will be visable on this site tagged with an API tag
            to flag that it was created using an external program. If you are
            actively working with the Shrunk API, it is recommended to look at
            the release notes from time to time for bug fixes or new
            improvements to the API.
          </Typography.Paragraph>
          <Space>
            <Button type="primary">Take me to the API Reference!</Button>
            <Button>Request an access token</Button>
          </Space>

          <Typography.Title level={3}>
            Frequently Asked Questions
          </Typography.Title>
          <Collapse>
            <Collapse.Panel header="How do I use this?" key="1">
              We do not have a dedicated API client or package you can install,
              but you can use any package that supports sending HTTP requests.
            </Collapse.Panel>
            <Collapse.Panel header="Are there restrictions?" key="2">
              The only limitation is you cannot specify custom aliases; if you
              need to specify a custom alias, please use our site.
            </Collapse.Panel>
            <Collapse.Panel header="How can I get access to this?" key="3">
              Click &quot;Request an access token&quot;.
            </Collapse.Panel>
            <Collapse.Panel header="I found a bug, who can I contact?" key="4">
              Please{' '}
              <Typography.Link href="mailto:oss@oit.rutgers.edu">
                send us an email
              </Typography.Link>{' '}
              describing your bug and how to reproduce it.
            </Collapse.Panel>
          </Collapse>
        </Col>
      </Row>
    </>
  );
}
