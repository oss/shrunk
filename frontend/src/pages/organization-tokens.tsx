import React, { useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { Button, Col, Row, Space, Table, Typography } from 'antd/lib';
import { getOrganization } from '../api/organization';
import { Organization } from '../interfaces/organizations';
import { CirclePlusIcon } from 'lucide-react';

type RouteParams = {
  id: string;
};

type IOrganizationToken = {
  userNetId: string;
  userPrivileges: Set<string>;
} & RouteComponentProps<RouteParams>;

function OrganizationToken(props: IOrganizationToken) {
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      const data = await getOrganization(props.match.params.id);
      setOrganization(data);
    };
    fetchOrganization();
  }, []);

  return (
    <Row gutter={16} justify="space-between" align="middle">
      <Col>
        <Typography.Title>Access Tokens</Typography.Title>
      </Col>
      <Col>
        <Space>
          <Button icon={<CirclePlusIcon />} type="primary" disabled>
            Generate
          </Button>
        </Space>
      </Col>
      <Col span={24}>
        <Table />
      </Col>
    </Row>
  );
}

export default withRouter(OrganizationToken);
