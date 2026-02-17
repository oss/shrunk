import React, { useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import {
  Button,
  Col,
  Row,
  Space,
  Typography,
  Drawer,
  Form,
  Input,
  Checkbox,
  Alert,
  Modal,
  message,
} from 'antd';
import { CirclePlusIcon, PlusCircleIcon } from 'lucide-react';
import {
  generateAccessToken,
  getAccessTokens,
  getValidAccessTokenPermissions,
} from '@/api/organization';
import AccessTokenCard from '@/components/access-token-card';
import { AccessTokenData } from '@/interfaces/access-token';

type RouteParams = {
  id: string;
};

type IOrganizationToken = RouteComponentProps<RouteParams>;

function OrganizationToken(props: IOrganizationToken) {
  const [accessTokens, setAccessTokens] = useState<AccessTokenData[]>([]);
  const [validPermissions, setValidPermissions] = useState<string[]>([]);
  const [isGeneratorDrawerOpen, setIsGeneratorDrawerOpen] =
    useState<boolean>(false);

  const [newAccessToken, setNewAccessToken] = useState<string | null>(null);

  const [form] = Form.useForm();

  useEffect(() => {
    const fetchOrganization = async () => {
      const accessTokensData = (await getAccessTokens(
        props.match.params.id,
      )) as AccessTokenData[];
      setAccessTokens(accessTokensData);
    };

    const fetchValidPermissions = async () => {
      const data = await getValidAccessTokenPermissions();
      setValidPermissions(data);
    };
    fetchValidPermissions();

    fetchOrganization();
  }, []);

  const onOpenGeneratorDrawer = () => {
    setIsGeneratorDrawerOpen(true);
  };

  const onCloseGeneratorDrawer = () => {
    setIsGeneratorDrawerOpen(false);
  };

  const onGenerate = async () => {
    form.validateFields().then(() => {
      try {
        generateAccessToken(
          form.getFieldValue('title'),
          form.getFieldValue('description'),
          form.getFieldValue('permissions'),
          props.match.params.id,
        ).then((token) => {
          setNewAccessToken(token);
        });
        form.resetFields();
        onCloseGeneratorDrawer();
      } catch (error) {
        message.error(
          'There was an error generating your access token. Please try again.',
        );
      }
    });
  };

  const refreshAccessTokens = async () => {
    const accessTokensData = (await getAccessTokens(
      props.match.params.id,
    )) as AccessTokenData[];
    setAccessTokens(accessTokensData);
  };

  return (
    <>
      <Row gutter={16} justify="space-between" align="middle">
        <Col>
          <Typography.Title>Access Tokens</Typography.Title>
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
          <Row gutter={[16, 16]}>
            {accessTokens.map((token) => (
              <Col key={token.token} span={24}>
                <AccessTokenCard accessTokenData={token} />
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
      <Drawer
        title="Access Token"
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
                description="Keeping your access token private is your responsibility. We salt and use Argon2, a quantum-safe and award-winning key derivation function, to encrypt your access token and store it in our database."
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
                    {validPermissions.map((permission: string) => (
                      <Col span={24}>
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
        title="Access Token Generated"
        open={newAccessToken !== null}
        footer={
          <Button
            type="primary"
            onClick={() => {
              navigator.clipboard.writeText(newAccessToken as string);
              refreshAccessTokens();
              message.success('Access token copied to clipboard');
              setNewAccessToken(null);
            }}
          >
            Copy to Clipboard
          </Button>
        }
        closable={false}
      >
        <Typography.Paragraph>
          Your access token has been generated. Please copy it and store it
          securely. It is impossible to retrieve it again through this website.
        </Typography.Paragraph>
      </Modal>
    </>
  );
}

export default withRouter(OrganizationToken);
