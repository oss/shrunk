/**
 * Implements the [[Admin]] component
 * @packageDocumentation
 */

import type { TabsProps } from 'antd';
import { Badge, Space, Tabs, Typography } from 'antd/lib';
import {
  ChartLineIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  UserIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getPendingLinksCount } from '../api/google-safebrowse';
import AdminStats from '../components/admin/AdminStats';
import BlockedLinks from '../components/admin/BlockedLinks';
import Security from '../components/admin/Security';
import UserLookup from '../components/admin/UserLookup';
import UsersProvider from '../contexts/Users';

const VALID_TABS = ['analytics', 'user-lookup', 'links', 'security'];
const DEFAULT_TAB = 'analytics';

export default function Admin(): React.ReactElement {
  const [linksToBeVerified, setLinksToBeVerified] = useState(-1);

  // Get the initial active tab from URL parameters, validate it, and fall back to default if invalid
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);

  useEffect(() => {
    const fetchData = async () => {
      setLinksToBeVerified(await getPendingLinksCount());
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
          <ChartLineIcon />
          Analytics
        </Space>
      ),
      children: <AdminStats />,
    },
    {
      key: 'user-lookup',
      label: (
        <Space direction="horizontal">
          <UserIcon />
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
          <ShieldCheckIcon />
          Link Control{' '}
          {linksToBeVerified > 0 && (
            <Badge count={linksToBeVerified} style={{ marginLeft: '8px' }} />
          )}
        </Space>
      ),
      children: (
        <UsersProvider>
          <BlockedLinks />
        </UsersProvider>
      ),
    },
    {
      key: 'security',
      label: (
        <Space direction="horizontal">
          <LockKeyholeIcon />
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
