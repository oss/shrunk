/**
 * Implements the [[Shrunk]] component
 * @packageDocumentation
 */

import {
  BookOutlined,
  BugOutlined,
  CodeOutlined,
  LogoutOutlined,
  SlidersOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  ConfigProvider,
  Dropdown,
  Image,
  Layout,
  Typography,
} from 'antd/lib';
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';

import { message } from 'antd';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Faq from './pages/Faq';
import Orgs from './pages/Orgs';

import Login from './pages/Login';
import ManageOrg from './pages/subpages/ManageOrg';
import { Stats } from './pages/subpages/Stats';

import { PendingAlerts } from './modals/PendingAlerts';
import { PendingRequests } from './modals/PendingRequests';

import ErrorPage from './pages/ErrorPage';
import HelpDesk from './pages/HelpDesk';

import { FeatureFlags } from './interfaces/app';
import { FeatureFlagsProvider, useFeatureFlags } from './contexts/FeatureFlags';
import rutgersLogo from './images/rutgers.png';
import ChangeLog from './pages/ChangeLog';
import Ticket from './pages/subpages/Ticket';
import { lightTheme } from './theme';
import { getUserInfo, logout } from './api/app';

const { Header, Content, Footer, Sider } = Layout;

interface Props {
  siderWidth: number;
}

export default function Shrunk(props: Props) {
  const { siderWidth } = props;
  const [userPrivileges, setUserPrivileges] = useState<Set<string>>(new Set());
  const [netid, setNetid] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const featureFlags: FeatureFlags = useFeatureFlags();

  function ProtectedRoute(protectedProps: {
    children: any;
    requiredPrivilege: string;
  }) {
    if (isLoading) {
      return <></>;
    }

    if (userPrivileges.has(protectedProps.requiredPrivilege)) {
      return protectedProps.children;
    }

    return (
      <ErrorPage
        title="Huh.."
        description="You do not have permission to access this page."
      />
    );
  }

  // Check session and fetch user info
  useEffect(() => {
    const checkSession = async () => {
      if (window.location.pathname === '/') {
        window.location.href = '/app/dash';
      }

      try {
        const data = await getUserInfo();

        if (data.netid) {
          setNetid(data.netid);
          setUserPrivileges(new Set(data.privileges || []));

          // If we're on login page and have session, redirect to dash
          if (window.location.pathname === '/app/login') {
            window.location.href = '/app/dash';
          }
        }
      } catch (error) {
        message.error(`Something went wrong. ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const showAdminTab = userPrivileges.has('admin');
  const role =
    userPrivileges.size === 0
      ? 'Whitelisted User'
      : userPrivileges.has('power_user')
      ? 'Power User'
      : userPrivileges.has('facstaff')
      ? 'Faculty'
      : 'Administrator';

  const [pendingAlerts, setPendingAlerts] = useState<string[]>([]);

  const updatePendingAlerts = async () => {
    // Scheduled for deletion: https://gitlab.rutgers.edu/MaCS/OSS/shrunk/-/issues/278
    // eslint-disable-next-line no-restricted-globals
    const resp = await fetch(`/api/v1/alert/${netid}`);
    const json = await resp.json();
    setPendingAlerts(json.pending_alerts as string[]);
  };

  const onLogout = async () => {
    window.location.href = await logout();
  };

  useEffect(() => {
    const init = async () => {
      if (netid) {
        updatePendingAlerts();
      }
    };

    init();
  }, [netid]);

  const menuItems: any[] = [
    {
      key: 'role-status',
      disabled: true,
      label: (
        <p className="tw-m-0 tw-text-center">
          {netid} ({role})
        </p>
      ),
    },
    { type: 'divider' },
    {
      key: 'orgs',
      icon: <TeamOutlined />,
      label: <a href="/app/orgs">My Organizations</a>,
    },
    ...(showAdminTab && featureFlags.helpDesk
      ? [
          {
            key: 'tickets',
            icon: <BugOutlined />,
            label: <a href="/tickets">Help Desk</a>,
          },
        ]
      : []),
    ...(showAdminTab
      ? [
          {
            key: 'admin-dashboard',
            icon: <SlidersOutlined />,
            label: <a href="/app/admin">Admin Dashboard</a>,
          },
        ]
      : []),
    { type: 'divider' },
    {
      key: 'releases',
      icon: <CodeOutlined />,
      label: <a href="/app/releases">Release Notes</a>,
    },
    {
      key: 'faq',
      icon: <BookOutlined />,
      label: <a href="/app/faq">FAQ</a>,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      onClick: onLogout,
      label: 'Logout',
      danger: true,
    },
  ];

  if (
    !isLoading &&
    window.location.pathname !== '/app/login' &&
    netid === '' &&
    window.location.pathname.split('/')[1] === 'app'
  ) {
    window.location.href = '/app/login';
  }

  const domain = window.location.hostname;

  // setSelectedKeysFromLocation() is scheduled to be deleted soon.
  const partToName: {
    [key: string]: { name: string; clickable: boolean; href?: string };
  } = {
    dash: { name: 'URL Shortener', clickable: true },
    orgs: { name: 'My Organizations', clickable: true },
    admin: { name: 'Admin Dashboard', clickable: true },
    tickets: { name: 'Help Desk', clickable: true },
    roles: { name: 'Role', clickable: false },
    faq: { name: 'Frequently Asked Questions', clickable: true },
    releases: { name: 'Release Notes', clickable: true },
    links: { name: 'URL Shortener', clickable: true, href: 'app/dash' },
  };
  const isApp = window.location.pathname.split('/').slice(1)[0] === 'app';

  return (
    <FeatureFlagsProvider>
      <ConfigProvider theme={lightTheme}>
        <App>
          <BrowserRouter>
            <Layout>
              {domain === 'shrunk.rutgers.edu' && (
                <Alert
                  message="This is a developer environment, any progress you make on this site is prone to deletion."
                  type="warning"
                  showIcon
                  closable
                />
              )}
              <Header className="tw-flex tw-items-center tw-justify-between">
                <a href={netid ? '/app/dash' : '/app/login'}>
                  <Image
                    preview={false}
                    alt="Rutgers"
                    src={rutgersLogo}
                    width="175px"
                    srcSet={rutgersLogo}
                  />
                </a>
                {netid && (
                  <Dropdown menu={{ items: menuItems }}>
                    <Button
                      type="text"
                      className="!tw-text-white"
                      loading={isLoading}
                    >
                      {netid}
                    </Button>
                  </Dropdown>
                )}
              </Header>
              <Layout>
                <Sider width={siderWidth} breakpoint="xl" collapsedWidth="10" />
                <Content className="tw-m-0 tw-min-h-[90vh] tw-p-6">
                  {pendingAlerts.length !== 0 && (
                    <PendingAlerts
                      netid={netid}
                      pendingAlerts={pendingAlerts}
                    />
                  )}
                  <PendingRequests />
                  {netid !== '' && isApp && (
                    <Breadcrumb
                      items={window.location.pathname
                        .split('/')
                        .slice(1)
                        .map((part, index, arr) => {
                          if (part === 'app') {
                            return {
                              title: 'Home',
                              href: '/',
                            };
                          }

                          if (!(part in partToName)) {
                            return {
                              title: part,
                            };
                          }

                          const path =
                            partToName[part].href === undefined
                              ? arr.slice(0, index + 1).join('/')
                              : partToName[part].href;

                          return {
                            title: partToName[part].name,
                            href: partToName[part].clickable
                              ? `/${path}`
                              : undefined,
                          };
                        })}
                    />
                  )}
                  <Switch>
                    <Route exact path="/app">
                      <Redirect to="/app/dash" />
                    </Route>
                    <Route exact path="/app/login">
                      <Login />
                    </Route>
                    <Route exact path="/app/dash">
                      <Dashboard
                        userPrivileges={userPrivileges}
                        netid={netid}
                      />
                    </Route>
                    <Route
                      exact
                      path="/app/links/:id"
                      render={(route) => (
                        <Stats
                          id={route.match.params.id}
                          netid={netid}
                          userPrivileges={userPrivileges}
                        />
                      )}
                    />
                    <Route exact path="/app/orgs">
                      <Orgs userPrivileges={userPrivileges} />
                    </Route>

                    <Route exact path="/app/orgs/:id">
                      <ManageOrg
                        userNetid={netid}
                        userPrivileges={userPrivileges}
                      />
                    </Route>
                    <Route exact path="/app/tickets">
                      <HelpDesk netid={netid} userPrivileges={userPrivileges} />
                    </Route>
                    <Route
                      exact
                      path="/app/tickets/:id"
                      render={(route) => (
                        <Ticket
                          ticketID={route.match.params.id}
                          userPrivileges={userPrivileges}
                        />
                      )}
                    />
                    <Route exact path="/app/faq">
                      <Faq />
                    </Route>
                    <Route exact path="/app/releases">
                      <ChangeLog />
                    </Route>
                    <Route exact path="/app/admin">
                      <ProtectedRoute requiredPrivilege="admin">
                        <Admin />
                      </ProtectedRoute>
                    </Route>
                    <Route path="*">
                      <ErrorPage
                        title="Ooops!"
                        description="
                              The page you are looking for is not found, are you sure you typed
                              the URL correctly?"
                      />
                    </Route>
                  </Switch>
                </Content>
                <Sider width={siderWidth} breakpoint="xl" collapsedWidth="10" />
              </Layout>
              <Footer className="tw-flex tw-justify-center tw-bg-black tw-text-center">
                <Typography.Paragraph className="tw-w-[70%] tw-text-gray-200">
                  Rutgers is an equal access/equal opportunity institution.
                  Individuals with disabilities are encouraged to direct
                  suggestions, comments, or complaints concerning any
                  accessibility issues with Rutgers websites to{' '}
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href="mailto:accessibility@rutgers.edu"
                  >
                    accessibility@rutgers.edu
                  </a>{' '}
                  or complete the{' '}
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href="https://rutgers.ca1.qualtrics.com/jfe/form/SV_57iH6Rfeocz51z0"
                  >
                    Report Accessibility Barrier or Provide Feedback Form
                  </a>
                  .
                </Typography.Paragraph>
              </Footer>
            </Layout>
          </BrowserRouter>
        </App>
      </ConfigProvider>
    </FeatureFlagsProvider>
  );
}
