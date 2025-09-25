/**
 * Implements the [[Shrunk]] component
 * @packageDocumentation
 */

import {
  BugIcon,
  CircleHelpIcon,
  CodeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  RocketIcon,
  UsersIcon,
} from 'lucide-react';

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
import Markdown from 'markdown-to-jsx';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Faq from './pages/Faq';
import ApiReference from './pages/ApiReference';
import MyOrganizations from './pages/organizations';

import Login from './pages/Login';
import ManageOrg from './pages/organization-manage';
import { Stats } from './pages/subpages/Stats';

import { PendingRequests } from './modals/PendingRequests';

import ErrorPage from './pages/ErrorPage';
import HelpDesk from './pages/HelpDesk';

import { getUserInfo, logout } from './api/app';
import { FeatureFlagsProvider, useFeatureFlags } from './contexts/FeatureFlags';
import rutgersLogo from './images/rutgers.png';
import { FeatureFlags } from './interfaces/app';
import ChangeLog from './pages/ChangeLog';
import Ticket from './pages/subpages/Ticket';
import { lightTheme } from './theme';
import { SearchQuery } from './interfaces/link';
import OrganizationToken from './pages/organization-tokens';

const { Header, Content, Footer, Sider } = Layout;

interface Props {
  siderWidth: number;
}

export default function Shrunk(props: Props) {
  const { siderWidth } = props;
  const [userPrivileges, setUserPrivileges] = useState<Set<string>>(new Set());
  const [netid, setNetid] = useState<string>('');
  const [filterOptions, setFilterOptions] = useState<SearchQuery>({
    queryString: '',
    set: { set: 'user' },
    show_expired_links: false,
    show_deleted_links: false,
    sort: { key: 'relevance', order: 'descending' },
    begin_time: null,
    end_time: null,
    showType: 'links',
    owner: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [motd, setMotd] = useState<string>('');

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
          setMotd(data.motd);
          setFilterOptions(data.filterOptions);

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
      : userPrivileges.has('guest')
      ? 'Guest User'
      : 'Administrator';

  const onLogout = async () => {
    window.location.href = await logout();
  };

  const onAlertClose = async () => {
    if (motd === '') {
      return;
    }

    localStorage.setItem('alert-read', motd);
  };

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
      icon: <UsersIcon />,
      label: <a href="/app/orgs">My Organizations</a>,
    },
    ...(showAdminTab && featureFlags.helpDesk
      ? [
          {
            key: 'tickets',
            icon: <BugIcon />,
            label: <a href="/tickets">Help Desk</a>,
          },
        ]
      : []),
    ...(showAdminTab
      ? [
          {
            key: 'admin-dashboard',
            icon: <LayoutDashboardIcon />,
            label: <a href="/app/admin">Admin Dashboard</a>,
          },
        ]
      : []),
    { type: 'divider' },
    {
      key: 'api-reference',
      icon: <CodeIcon />,
      label: <a href="/app/api-reference">API Reference</a>,
    },
    { type: 'divider' },
    {
      key: 'releases',
      icon: <RocketIcon />,
      label: <a href="/app/releases">Release Notes</a>,
    },
    {
      key: 'faq',
      icon: <CircleHelpIcon />,
      label: <a href="/app/faq">FAQ</a>,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogOutIcon />,
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
    'api-reference': { name: 'API Reference', clickable: false },
  };
  const isApp = window.location.pathname.split('/').slice(1)[0] === 'app';
  const showMotd = motd !== '' && localStorage.getItem('alert-read') !== motd;

  return (
    <FeatureFlagsProvider>
      <ConfigProvider theme={lightTheme}>
        <App>
          <BrowserRouter>
            <Layout>
              {domain === 'shrunk.rutgers.edu' && (
                <Alert
                  message={
                    <Typography.Text>
                      This is a developer environment, any progress you make on
                      this site is prone to deletion. Please use the real site
                      at <a href="https://go.rutgers.edu">go.rutgers.edu</a>.
                    </Typography.Text>
                  }
                  type="warning"
                  showIcon
                  banner
                  closable
                />
              )}

              {showMotd && (
                <Alert
                  message={<Markdown>{motd}</Markdown>}
                  type="info"
                  showIcon
                  closable
                  onClose={onAlertClose}
                  banner
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
                        filterOptions={filterOptions}
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
                      <MyOrganizations userPrivileges={userPrivileges} />
                    </Route>

                    <Route exact path="/app/orgs/:id">
                      <ManageOrg
                        userNetid={netid}
                        userPrivileges={userPrivileges}
                      />
                    </Route>
                    <Route exact path="/app/orgs/:id/tokens">
                      <OrganizationToken
                        userNetId={netid}
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
                    <Route exact path="/app/api-reference">
                      <ApiReference />
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
