/**
 * Implements the [[Admin]] component
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';
import { Row, Col, Spin, Badge, Card, Typography, Space } from 'antd/lib';
import { Link } from 'react-router-dom';
import {
  LineChartOutlined,
  UserOutlined,
  SafetyOutlined,
  TeamOutlined,
} from '@ant-design/icons';

interface RoleInfo {
  name: string;
  display_name: string;
}

export default function Admin(): React.ReactElement {
  const [roles, setRoles] = useState<RoleInfo[] | null>(null);
  const [linksToBeVerified, setLinksToBeVerified] = useState(-1);
  const [powerUserRequestsCount, setPowerUserRequestsCount] = useState(-1);

  const updatePendingPowerUserRequestsCount = async () => {
    const response = await fetch('/api/v1/role_request/power_user/count');
    const json = await response.json();
    setPowerUserRequestsCount(json.count);
  };

  useEffect(() => {
    const fetchData = async () => {
      // Fetch pending links count
      const linksResp = await fetch('/api/v1/security/pending_links/count');
      const linksJson = await linksResp.json();
      setLinksToBeVerified(linksJson.pending_links_count);

      // Fetch roles
      const rolesResp = await fetch('/api/v1/role');
      const rolesJson = await rolesResp.json();
      setRoles(rolesJson.roles);

      // Fetch power user requests
      await updatePendingPowerUserRequestsCount();
    };

    fetchData();
  }, []);

  const adminCards = [
    {
      title: 'Admin Statistics',
      icon: <LineChartOutlined />,
      link: '/admin/stats',
    },
    {
      title: 'User Lookup',
      icon: <UserOutlined />,
      link: '/admin/user_lookup',
    },
    {
      title: 'Unsafe Links Pending Verification',
      icon: <SafetyOutlined />,
      link: '/admin/link_security',
      badge: linksToBeVerified === -1 ? (
        <Spin size="small" />
      ) : (
        <Badge count={linksToBeVerified} />
      ),
    },
    {
      title: 'Pending Power User Role Requests',
      icon: <TeamOutlined />,
      link: '/admin/role_requests/power_user',
      badge: powerUserRequestsCount === -1 ? (
        <Spin size="small" />
      ) : (
        <Badge count={powerUserRequestsCount} />
      ),
    },
  ];

  return (
    <>
      <Typography.Title>Administrator Controls</Typography.Title>
      
      <Row gutter={[16, 16]}>
        {adminCards.map((card) => (
          <Col xs={24} sm={12} md={8} lg={6} key={card.link}>
            <Card hoverable>
              <Link to={card.link}>
                <Space direction="vertical" style={{ width: '100%' }} align="center">
                  {card.icon}
                  <Typography.Text strong>{card.title}</Typography.Text>
                  {card.badge}
                </Space>
              </Link>
            </Card>
          </Col>
        ))}
        
        {roles === null ? (
          <Col span={24}>
            <Spin size="large" />
          </Col>
        ) : (
          roles.map((role) => (
            <Col xs={24} sm={12} md={8} lg={6} key={role.name}>
              <Card hoverable>
                <Link to={`/roles/${role.name}`}>
                  <Space direction="vertical" style={{ width: '100%' }} align="center">
                    <TeamOutlined />
                    <Typography.Text strong>{role.display_name}</Typography.Text>
                  </Space>
                </Link>
              </Card>
            </Col>
          ))
        )}
      </Row>
    </>
  );
}
