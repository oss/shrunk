/**
 * Implements the [[SuperTokens]] component
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Button,
  Typography,
  Space,
  Drawer,
  Form,
  Input,
  Checkbox,
  Alert,
  Modal,
  message,
  List,
} from 'antd';
import { CirclePlusIcon, PlusCircleIcon } from 'lucide-react';
import { AccessTokenData } from '@/interfaces/access-token';
import {
  getSuperTokens,
  generateAccessToken,
  getValidAccessTokenPermissions,
} from '@/api/organization';
import AccessTokenCard from '@/components/access-token-card';

export default function SuperTokens(): JSX.Element {
  const [accessTokens, setAccessTokens] = useState<AccessTokenData[]>([]);
  const [validPermissions, setValidPermissions] = useState<string[]>([]);
  const [isGeneratorDrawerOpen, setIsGeneratorDrawerOpen] =
    useState<boolean>(false);
  const [newAccessToken, setNewAccessToken] = useState<string | null>(null);

  const [form] = Form.useForm();

  useEffect(() => {
    const fetchTokens = async () => {
      const tokens = await getSuperTokens();
      setAccessTokens(tokens);
    };

    const fetchValidPermissions = async () => {
      const perms = await getValidAccessTokenPermissions();
      setValidPermissions(perms);
    };

    fetchTokens();
    fetchValidPermissions();
  }, []);

  const onOpenGeneratorDrawer = () => setIsGeneratorDrawerOpen(true);
  const onCloseGeneratorDrawer = () => setIsGeneratorDrawerOpen(false);

  const onGenerate = async () => {
    form.validateFields().then(() => {
      try {
        generateAccessToken(
          form.getFieldValue('title'),
          form.getFieldValue('description'),
          form.getFieldValue('permissions'),
        ).then((token) => {
          setNewAccessToken(token);
        });
        form.resetFields();
        onCloseGeneratorDrawer();
      } catch (error) {
        message.error(
          'There was an error generating your super access token. Please try again.',
        );
      }
    });
  };

  const refreshAccessTokens = async () => {
    const tokens = await getSuperTokens();
    setAccessTokens(tokens);
  };

  return (
    <>
      <Row gutter={16} justify="space-between" align="middle">
        <Col>
          <Typography.Title>Super Access Tokens</Typography.Title>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<CirclePlusIcon />}
              type="primary"
              onClick={onOpenGeneratorDrawer}
            >
              Generate
            </Button>
          </Space>
        </Col>
        <Col span={24}>
          <List
            dataSource={accessTokens}
            renderItem={(token) => (
              <List.Item>
                <AccessTokenCard accessTokenData={token} />
              </List.Item>
            )}
            pagination={{
              pageSize: 3,
              position: 'bottom',
              align: 'center',
            }}
          />
        </Col>
      </Row>

      <Drawer
        title="Super Access Token"
        placement="right"
        onClose={onCloseGeneratorDrawer}
        width={720}
        open={isGeneratorDrawerOpen}
        extra={
          <Space>
            <Button
              icon={<PlusCircleIcon />}
              onClick={onGenerate}
              type="primary"
            >
              Generate
            </Button>
          </Space>
        }
      >
        <Form layout="vertical" requiredMark={false} form={form}>
          <Row gutter={16}>
            <Col span={24} className="tw-mb-4">
              <Alert
                title="Secure your data."
                description="Keeping your access token private is your responsibility. We salt and use Argon2, a quantum-safe and award-winning key derivation function, to encrypt your super token and store it in our database."
                type="warning"
              />
            </Col>
            <Col span={24}>
              <Form.Item
                label="Title"
                name="title"
                rules={[
                  { required: true, message: 'You must give this a title' },
                ]}
              >
                <Input placeholder="What is the name of your project?" />
              </Form.Item>
              <Form.Item
                label="Description"
                name="description"
                rules={[
                  {
                    required: true,
                    message: 'What are you using this project for?',
                  },
                ]}
              >
                <Input.TextArea placeholder="What are you using this token for?" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Permissions" name="permissions">
                <Checkbox.Group className="tw-w-full">
                  <Row gutter={16}>
                    {validPermissions.map((permission) => (
                      <Col span={24} key={permission}>
                        <Checkbox value={permission}>{permission}</Checkbox>
                      </Col>
                    ))}
                  </Row>
                </Checkbox.Group>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>

      <Modal
        title="Super Access Token Generated"
        open={newAccessToken !== null}
        footer={
          <Button
            type="primary"
            onClick={() => {
              navigator.clipboard.writeText(newAccessToken as string);
              refreshAccessTokens();
              message.success('Super access token copied to clipboard');
              setNewAccessToken(null);
            }}
          >
            Copy to Clipboard
          </Button>
        }
        closable={false}
      >
        <Typography.Paragraph>
          Your super access token has been generated. Please copy it and store
          it securely. It is impossible to retrieve it again through this
          website.
        </Typography.Paragraph>
      </Modal>
    </>
  );
}
