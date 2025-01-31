/**
 * Implements the [[Admin]] component
 * @packageDocumentation
 */

import React, { useEffect, useState } from 'react';
import { Layout, Spin, Badge, Typography, Menu } from 'antd/lib';
import Icon, {
  LineChartOutlined,
  UserOutlined,
  SafetyOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Content } from 'antd/lib/layout/layout';
import Sider from 'antd/lib/layout/Sider';
import { MenuProps } from 'antd';
import AdminStats from '../components/admin/AdminStats';
import UserLookup from '../components/admin/UserLookup';
import UsersProvider from '../contexts/Users';

/**
 * Props for the [[Admin]] component
 * @interface
 */
export interface Props {}

/**
 * Summary information for one role
 * @interface
 */
interface RoleInfo {
  name: string;
  display_name: string;
}

const SidebarTabs: MenuProps['items'] = [
  {
    key: 'analytics',
    icon: React.createElement(LineChartOutlined),
    label: 'Analytics',
    onClick: () => {

    }
  },
  {
    key: 'users',
    icon: React.createElement(UserOutlined),
    label: 'Users',
    children: [
      {
        key: 'user-lookup',
        label: 'User Lookup',
      },
      {
        key: 'manage-access',
        label: 'Manage Access',
      },
    ],
  },
  {
    key: 'links',
    icon: React.createElement(SafetyOutlined),
    label: 'Links',
  },
];

export default function Admin(): React.ReactElement {
  const [roles, setRoles] = useState<RoleInfo[] | null>(null);
  const [linksToBeVerified, setLinksToBeVerified] = useState(-1);
  const [powerUserRequestsCount, setPowerUserRequestsCount] = useState(-1);
  const [isDomainEnabled, setIsDomainEnabled] = useState(false);
  const [selectedView, setSelectedView] = useState("analytics");
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
      await updateIsDomainEnabled();
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
      badge:
        linksToBeVerified === -1 ? (
          <Spin size="small" />
        ) : (
          <Badge count={linksToBeVerified} />
        ),
    },
    {
      title: 'Pending Power User Role Requests',
      icon: <TeamOutlined />,
      link: '/admin/role_requests/power_user',
      badge:
        powerUserRequestsCount === -1 ? (
          <Spin size="small" />
        ) : (
          <Badge count={powerUserRequestsCount} />
        ),
    },
  ];

  if (isDomainEnabled) {
    adminCards.push({
      title: 'Custom Domains',
      icon: <Icon type="link" />,
      link: '/admin/domain',
    });
  }
  return (
    <>
      <Typography.Title>Administrator Controls</Typography.Title>
      <Layout>
        <Sider 
          width={200} 
        >
          <div style={{ display: 'flex', height: '100%' }}>
            <Menu
              mode="inline"
              defaultSelectedKeys={['analytics']}
              style={{ 
                height: '100%',
                paddingRight: '12px', 
                borderRight: '2px solid #d9d9d9',
              }}
              items={SidebarTabs}
              onClick={(e) => {
                switch(e.key) {
                  case 'analytics':
                    setSelectedView('analytics');
                    break;
                  case 'user-lookup':
                    setSelectedView('user-lookup');
                    break;
                  case 'manage-access':
                    setSelectedView('manage-access');
                    break;
                  case 'links':
                    setSelectedView('links');
                    break;
                  default:
                    break;
                }
              }}
            />
          </div>
        </Sider>
        <Content style={{ padding: '0 24px', minHeight: 280 }}>
            {
              selectedView === 'analytics' && ( <AdminStats /> )
            }

            {
              selectedView === 'user-lookup' && ( 
              <UsersProvider>
                <UserLookup />
              </UsersProvider>
            )
            }

            {
              selectedView === 'manage-access' && ( <TeamOutlined /> )
            }

            {
              selectedView === 'links' && ( <SafetyOutlined /> )
            }
        </Content>
      </Layout>
    </>
  );
}
