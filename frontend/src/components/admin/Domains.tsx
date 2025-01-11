import React, { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';

const { Title } = Typography;

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
            const response = await fetch(`/api/v1/org/domain`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ org_name: values.org, domain_name: values.domain }),
            });

            if (!response.ok) {
                throw new Error(`Failed to add domain: ${response.statusText}`);
            }

            message.success('Custom Domain Request Succeeded');
            grantForm.resetFields();
        } catch (error) {
            console.error('Error:', error);
            message.error('Custom Domain Request Failed');
        } finally {
            setLoading(false);
        }
    };

    const deleteDomain = async (values: DomainFormValues) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/org/domain`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ org_name: values.org, domain_name: values.domain }),
            });

            if (!response.ok) {
                throw new Error(`Failed to delete domain: ${response.statusText}`);
            }

            message.success('Custom Domain Deletion Succeeded');
            deleteForm.resetFields();
        } catch (error) {
            console.error('Error:', error);
            message.error('Custom Domain Deletion Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
            <Title level={3}>Custom Domain Grant Request</Title>
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
                    rules={[{ required: true, message: 'Please enter the organization name.' }]}
                >
                    <Input placeholder="Example Organization" />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: '#cc0e32', color: 'white' }}>
                        Grant Domain
                    </Button>
                </Form.Item>
            </Form>

            <Title level={3} style={{ marginTop: '2rem' }}>Custom Domain Deletion</Title>
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
                    rules={[{ required: true, message: 'Please enter the organization name.' }]}
                >
                    <Input placeholder="Example Organization" />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: '#cc0e32', color: 'white' }}>
                        Delete Domain
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default Domains;
