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
} from 'antd/lib';
import { CirclePlusIcon } from 'lucide-react';
import { getOrganization } from '../api/organization';
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
        title="Generate Access Token"
        placement="right"
        onClose={onCloseGeneratorDrawer}
        width={720}
        open={isGeneratorDrawerOpen}
      >
        <Form layout="vertical" requiredMark={false}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Title" required>
                <Input placeholder="What is the name of your project?" />
              </Form.Item>
              <Form.Item label="Description" required>
                <Input.TextArea placeholder="What are you using this token for?" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Typography.Text>
                TODO: Put token permissions here
              </Typography.Text>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </>
  );
}

export default withRouter(OrganizationToken);
