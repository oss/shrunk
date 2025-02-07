/**
 * Implements the [[Admin]] component
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';
import { Badge, Typography, Tabs, Space, ConfigProvider } from 'antd';
import {
  LineChartOutlined,
  UserOutlined,
  SafetyOutlined,
  TeamOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { Content } from 'antd/lib/layout/layout';
import type { TabsProps } from 'antd';
import AdminStats from '../components/admin/AdminStats';
import UserLookup from '../components/admin/UserLookup';
import UsersProvider from '../contexts/Users';
import ManageUserAccess from '../components/admin/ManageUserAccess';
import BlockedLinks from '../components/admin/BlockedLinks';
import { red } from '@ant-design/colors';
import Security from '../components/admin/Security';

/**
 * Summary information for one role
 * @interface
 */
interface RoleInfo {
  name: string;
  display_name: string;
}
/**
 * Props for the [[Admin]] component
 * @interface
 */
interface AdminProps {
  userNetid: string;
  userPrivileges: Set<string>;
}

export default function Admin(props: AdminProps): React.ReactElement {
  const [roles, setRoles] = useState<RoleInfo[] | null>(null);
  const [linksToBeVerified, setLinksToBeVerified] = useState(-1);
  const [powerUserRequestsCount, setPowerUserRequestsCount] = useState(-1);
  const [isDomainEnabled, setIsDomainEnabled] = useState(false);

  const updatePendingPowerUserRequestsCount = async () => {
    const response = await fetch('/api/v1/role_request/power_user/count');
    const json = await response.json();
    setPowerUserRequestsCount(json.count);
  };

  const updateIsDomainEnabled = async () => {
    const response = await fetch('/api/v1/org/domain_enabled');
    const json = await response.json();
    setIsDomainEnabled(json.enabled);
  };

  useEffect(() => {
    const fetchData = async () => {
      const linksResp = await fetch('/api/v1/security/pending_links/count');
      const linksJson = await linksResp.json();
      setLinksToBeVerified(linksJson.pending_links_count);

      const rolesResp = await fetch('/api/v1/role');
      const rolesJson = await rolesResp.json();
      setRoles(rolesJson.roles);

      await updatePendingPowerUserRequestsCount();
      await updateIsDomainEnabled();
    };

    fetchData();
  }, []);

  const items: TabsProps['items'] = [
    {
      key: 'analytics',
      label: (
        <Space direction="horizontal">
          <LineChartOutlined />
          Analytics
        </Space>
      ),
      children: <AdminStats />,
    },
    {
      key: 'user-lookup',
      label: (
        <Space direction="horizontal">
          <UserOutlined />
          User Lookup
        </Space>
      ),
      children: (
        <UsersProvider>
          <UserLookup />
        </UsersProvider>
      ),
    },
    {
      key: 'manage-access',
      label: (
        <Space direction="horizontal">
          <TeamOutlined />
          Manage Access
        </Space>
      ),
      children: (
        <UsersProvider>
          <ManageUserAccess
            userNetid={props.userNetid}
            userPrivileges={props.userPrivileges}
          />
        </UsersProvider>
      ),
    },
    {
      key: 'links',
      label: (
        <Space direction="horizontal">
          <SafetyOutlined />
          Links{' '}
          {linksToBeVerified > 0 && (
            <Badge count={linksToBeVerified} style={{ marginLeft: '8px' }} />
          )}
        </Space>
      ),
      children: (
        <UsersProvider>
          <BlockedLinks name="power_user" />
        </UsersProvider>
      ),
    },
    {
      key: 'security',
      label: (
        <Space direction="horizontal">
          <LockOutlined />
          Security
        </Space>
      ),
      children: <Security />,
    },
  ];

  return (
    <>
      <Typography.Title>Administrator Controls</Typography.Title>
      <Content>
        <ConfigProvider
          theme={{
            inherit: true,
            components: {
              Tabs: {
                itemHoverColor: red[6],
                itemSelectedColor: red[6],
                itemActiveColor: red[6],
              },
            },
          }}
        >
          <Tabs defaultActiveKey="analytics" items={items} type="card" />
        </ConfigProvider>
      </Content>
    </>
  );
}
