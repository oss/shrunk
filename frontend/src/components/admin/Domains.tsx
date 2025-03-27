/* eslint-disable no-restricted-globals */

// TODO: Scheduled for deletion: https://gitlab.rutgers.edu/MaCS/OSS/shrunk/-/issues/260

import React, { useState } from 'react';
import { Form, Input, Button, Typography, message, Col } from 'antd';

interface DomainFormValues {
  domain: string;
  org: string;
}

const Domains: React.FC = () => {
  const [grantForm] = Form.useForm<DomainFormValues>();
  const [deleteForm] = Form.useForm<DomainFormValues>();
  const [loading, setLoading] = useState(false);

  const addDomain = async (values: DomainFormValues) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/core/org/domain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: values.org,
          domain_name: values.domain,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add domain: ${response.statusText}`);
      }

      message.success('Custom Domain Request Succeeded');
      grantForm.resetFields();
    } catch (error) {
      message.error('Custom Domain Request Failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteDomain = async (values: DomainFormValues) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/core/org/domain`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_name: values.org,
          domain_name: values.domain,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete domain: ${response.statusText}`);
      }

      message.success('Custom Domain Deletion Succeeded');
      deleteForm.resetFields();
    } catch (error) {
      message.error(`Custom Domain Deletion Failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Col>
      <Typography.Title level={3}>Custom Domain Grant Request</Typography.Title>
      <Form
        form={grantForm}
        layout="vertical"
        onFinish={addDomain}
        autoComplete="off"
      >
        <Form.Item
          label="Domain Name"
          name="domain"
          rules={[{ required: true, message: 'Please enter the domain name.' }]}
        >
          <Input placeholder="Domain" />
        </Form.Item>

        <Form.Item
          label="Organization Name"
          name="org"
          rules={[
            { required: true, message: 'Please enter the organization name.' },
          ]}
        >
          <Input placeholder="Example Organization" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            style={{ backgroundColor: '#cc0e32', color: 'white' }}
          >
            Grant Domain
          </Button>
        </Form.Item>
      </Form>

      <Typography.Title level={3} style={{ marginTop: '2rem' }}>
        Custom Domain Deletion
      </Typography.Title>
      <Form
        form={deleteForm}
        layout="vertical"
        onFinish={deleteDomain}
        autoComplete="off"
      >
        <Form.Item
          label="Domain Name"
          name="domain"
          rules={[{ required: true, message: 'Please enter the domain name.' }]}
        >
          <Input placeholder="Domain" />
        </Form.Item>

        <Form.Item
          label="Organization Name"
          name="org"
          rules={[
            { required: true, message: 'Please enter the organization name.' },
          ]}
        >
          <Input placeholder="Example Organization" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            style={{ backgroundColor: '#cc0e32', color: 'white' }}
          >
            Delete Domain
          </Button>
        </Form.Item>
      </Form>
    </Col>
  );
};

export default Domains;
