import React, { useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import {
  Button,
  Col,
  Row,
  Space,
  Table,
  Typography,
  Drawer,
  Form,
  Tree,
  TreeDataNode,
  Input,
  Checkbox,
  Select,
  Alert,
} from 'antd/lib';
import { CirclePlusIcon, PlusCircleIcon } from 'lucide-react';
import { generateAccessToken, getOrganization } from '../api/organization';
import { Organization } from '../interfaces/organizations';

type RouteParams = {
  id: string;
};

type IOrganizationToken = {
  userNetId: string;
  userPrivileges: Set<string>;
} & RouteComponentProps<RouteParams>;

function OrganizationToken(props: IOrganizationToken) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isGeneratorDrawerOpen, setIsGeneratorDrawerOpen] =
    useState<boolean>(false);

  const [form] = Form.useForm();

  useEffect(() => {
    const fetchOrganization = async () => {
      const data = await getOrganization(props.match.params.id);
      setOrganization(data);
    };
    fetchOrganization();
  }, []);

  const onOpenGeneratorDrawer = () => {
    setIsGeneratorDrawerOpen(true);
  };

  const onCloseGeneratorDrawer = () => {
    setIsGeneratorDrawerOpen(false);
  };

  const onGenerate = async () => {
    generateAccessToken(
      props.match.params.id,
      form.getFieldValue('title'),
      form.getFieldValue('description'),
      form.getFieldValue('permissions'),
    );
    form.resetFields();
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
          <Table />
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
                message="Your data is secure."
                description="We salt and use Argon2, a quantum-safe and award-winning key derivation function, to encrypt your access token and store it in our database."
                type="info"
              />
            </Col>
            <Col span={24}>
              <Form.Item label="Title" required name="title">
                <Input placeholder="What is the name of your project?" />
              </Form.Item>
              <Form.Item label="Description" required name="description">
                <Input.TextArea placeholder="What are you using this token for?" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Permissions" name="permissions">
                <Checkbox.Group className="tw-w-full">
                  <Row gutter={16}>
                    <Col span={24}>
                      <Checkbox value="read:links">read:links</Checkbox>
                    </Col>
                    <Col span={24}>
                      <Checkbox value="create:links">create:links</Checkbox>
                    </Col>
                    <Col span={24}>
                      <Checkbox value="edit:links">edit:links</Checkbox>
                    </Col>
                    <Col span={24}>
                      <Checkbox value="delete:links">delete:links</Checkbox>
                    </Col>
                    <Col span={24}>
                      <Checkbox value="read:tracking-pixels">
                        read:tracking-pixels
                      </Checkbox>
                    </Col>
                    <Col span={24}>
                      <Checkbox value="create:tracking-pixels">
                        create:tracking-pixels
                      </Checkbox>
                    </Col>
                    <Col span={24}>
                      <Checkbox value="edit:tracking-pixels">
                        edit:tracking-pixels
                      </Checkbox>
                    </Col>
                    <Col span={24}>
                      <Checkbox value="delete:tracking-pixels">
                        delete:tracking-pixels
                      </Checkbox>
                    </Col>
                  </Row>
                </Checkbox.Group>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </>
  );
}

export default withRouter(OrganizationToken);
