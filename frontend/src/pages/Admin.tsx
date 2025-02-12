/**
 * Implements the [[Admin]] component
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';
import { Badge, Typography, Tabs, Space } from 'antd/lib';
import {
  LineChartOutlined,
  UserOutlined,
  SafetyOutlined,
  LockOutlined,
} from '@ant-design/icons';
import type { TabsProps } from 'antd';
import AdminStats from '../components/admin/AdminStats';
import UserLookup from '../components/admin/UserLookup';
import UsersProvider from '../contexts/Users';
import BlockedLinks from '../components/admin/BlockedLinks';
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

const VALID_TABS = ['analytics', 'user-lookup', 'links', 'security'];
const DEFAULT_TAB = 'analytics';

export default function Admin(props: AdminProps): React.ReactElement {
  const [roles, setRoles] = useState<RoleInfo[] | null>(null);
  const [linksToBeVerified, setLinksToBeVerified] = useState(-1);
  const [powerUserRequestsCount, setPowerUserRequestsCount] = useState(-1);
  const [isDomainEnabled, setIsDomainEnabled] = useState(false);

  // Get the initial active tab from URL parameters, validate it, and fall back to default if invalid
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);

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

  useEffect(() => {
    const handleLocationChange = () => {
      const hashParams = new URLSearchParams(
        window.location.hash.split('?')[1] || '',
      );
      const tabParam = hashParams.get('tab');
      if (!VALID_TABS.includes(tabParam || '')) {
        const baseUrl = window.location.pathname;
        const hash = window.location.hash.split('?')[0];
        window.history.pushState(
          {},
          '',
          `${baseUrl}${hash}?tab=${DEFAULT_TAB}`,
        );
        setActiveTab(DEFAULT_TAB);
      } else {
        setActiveTab(tabParam!);
      }
    };

    window.addEventListener('hashchange', handleLocationChange);
    handleLocationChange(); // Handle initial URL

    return () => window.removeEventListener('hashchange', handleLocationChange);
  }, []);

  const handleTabChange = (key: string) => {
    if (VALID_TABS.includes(key)) {
      setActiveTab(key);
      const baseUrl = window.location.pathname;
      const hash = window.location.hash.split('?')[0];
      window.history.pushState({}, '', `${baseUrl}${hash}?tab=${key}`);
    }
  };

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
      key: 'links',
      label: (
        <Space direction="horizontal">
          <SafetyOutlined />
          Link Control{' '}
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
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={items}
        type="card"
      />
    </>
  );
}
