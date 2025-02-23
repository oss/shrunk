/**
 * Implements the [[Shrunk]] component
 * @packageDocumentation
 */

import {
  BookOutlined,
  BugOutlined,
  CodeOutlined,
  LogoutOutlined,
  MenuOutlined,
  SlidersOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  Col,
  ConfigProvider,
  Dropdown,
  Image,
  Layout,
  Menu,
  Row,
  Tag,
  Typography,
} from 'antd/lib';
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Link,
  NavLink,
  Redirect,
  Route,
  Switch,
} from 'react-router-dom';

import { message } from 'antd';
import Admin from './pages/Admin';
import { Dashboard } from './pages/Dashboard';
import Faq from './pages/Faq';
import Orgs from './pages/Orgs';

import { Role } from './components/admin/Role';
import ManageOrg from './pages/subpages/ManageOrg';
import { Stats } from './pages/subpages/Stats';
import Login from './pages/Login';

import { PendingAlerts } from './modals/PendingAlerts';
import { PendingRequests } from './modals/PendingRequests';

import HelpDesk from './pages/HelpDesk';
import LinkHubDashboard from './pages/LinkHubDashboard';
import LinkHubEditor from './pages/subpages/LinkHubEditor';
import ErrorPage from './pages/ErrorPage';

import rutgersLogo from './images/rutgers.png';
import Ticket from './pages/subpages/Ticket';
import { lightTheme } from './theme';
import ChangeLog from './pages/ChangeLog';

const { Header, Content, Footer, Sider } = Layout;

interface Props {
  siderWidth: number;
}

export default function Shrunk(props: Props) {
  const { siderWidth } = props;
  const [userPrivileges, setUserPrivileges] = useState<Set<string>>(new Set());
  const [netid, setNetid] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  function ProtectedRoute(protectedProps: {
    children: any;
    requiredPrivilege: string;
  }) {
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
        const response = await fetch('/api/v1/user/info');
        const data = await response.json();

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
  const [isLinkHubEnabled, setIsLinkHubEnabled] = useState(false);
  const [isHelpDeskEnabled, setIsHelpDeskEnabled] = useState(false);

  const fetchFeatureStatuses = async () => {
    const resp = await fetch('/api/v1/config');
    const json = await resp.json();
    setIsLinkHubEnabled(json.linkhub);
  };

  const fetchIsHelpDeskEnabled = async () => {
    const response = await fetch('/api/v1/ticket/enabled');
    const body = await response.json();
    setIsHelpDeskEnabled(body.enabled as boolean);
  };

  const updatePendingAlerts = async () => {
    const resp = await fetch(`/api/v1/alert/${netid}`);
    const json = await resp.json();
    setPendingAlerts(json.pending_alerts as string[]);
  };

  const onLogout = async () => {
    await fetch('/api/v1/logout', {
      method: 'POST',
    })
      .then((response) => response.json())
      .then((data: any) => {
        if ('redirect-to' in data) {
          window.location.href = data['redirect-to'];
        }
      });
  };

  useEffect(() => {
    const init = async () => {
      if (netid) {
        await fetchFeatureStatuses();
        await fetchIsHelpDeskEnabled();
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
        <p style={{ margin: 0, marginBottom: '-4px', textAlign: 'center' }}>
          {netid} ({role})
        </p>
      ),
      style: {
        textAlign: 'center',
        cursor: 'default',
        paddingTop: '8px',
        paddingBottom: '8px',
      },
    },
    { type: 'divider' },
    {
      key: 'orgs',
      icon: <TeamOutlined />,
      label: <NavLink to="/app/orgs">My Organizations</NavLink>,
    },
    ...(showAdminTab || isHelpDeskEnabled
      ? [
          {
            key: 'tickets',
            icon: <BugOutlined />,
            label: <NavLink to="/tickets">Help Desk</NavLink>,
          },
        ]
      : []),
    ...(showAdminTab
      ? [
          {
            key: 'admin-dashboard',
            icon: <SlidersOutlined />,
            label: <NavLink to="/app/admin">Admin Dashboard</NavLink>,
          },
        ]
      : []),
    { type: 'divider' },
    {
      key: 'faq',
      icon: <BookOutlined />,
      label: <NavLink to="/app/faq">FAQ</NavLink>,
    },
    {
      key: 'releases',
      icon: <CodeOutlined />,
      label: <NavLink to="/app/releases">Release Notes</NavLink>,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      onClick: onLogout,
      label: 'Logout',
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
    linkhubs: { name: 'LinkHub', clickable: false },
    orgs: { name: 'My Organizations', clickable: true },
    admin: { name: 'Admin Dashboard', clickable: true },
    tickets: { name: 'Help Desk', clickable: true },
    roles: { name: 'Role', clickable: false },
    faq: { name: 'Frequently Asked Questions', clickable: true },
    releases: { name: 'Release Notes', clickable: true },
    links: { name: 'URL Shortener', clickable: true, href: '/app/dash' },
  };

  return (
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
            <Header>
              <Row gutter={16}>
                <Col className="tw-flex tw-items-center tw-justify-center">
                  <Link to={netid ? '/app/dash' : '/app/login'}>
                    <Image
                      preview={false}
                      alt="Rutgers"
                      src={rutgersLogo}
                      width="175px"
                      srcSet={rutgersLogo}
                    />
                  </Link>
                </Col>
                <Col flex="auto">
                  {netid && (
                    <Menu
                      overflowedIndicator={<MenuOutlined />}
                      mode="horizontal"
                    >
                      <Menu.Item key="dash">
                        <NavLink to="/app/dash">URL Shortener</NavLink>
                      </Menu.Item>
                      {isLinkHubEnabled ? (
                        <Menu.Item key="linkhubs">
                          <NavLink to="/app/linkhubs">
                            LinkHub <Tag color="warning">beta</Tag>
                          </NavLink>
                        </Menu.Item>
                      ) : (
                        <></>
                      )}
                    </Menu>
                  )}
                </Col>
                <Col className="tw-flex tw-items-center tw-justify-center">
                  {isLoading ? (
                    <Button type="text" className="tw-text-white" loading />
                  ) : netid ? (
                    <Dropdown menu={{ items: menuItems }}>
                      <Button type="text" className="tw-text-white">
                        {netid}
                      </Button>
                    </Dropdown>
                  ) : (
                    <></>
                  )}
                </Col>
              </Row>
            </Header>
            <Layout>
              <Sider width={siderWidth} breakpoint="xl" collapsedWidth="10" />
              <Content className="tw-m-0 tw-p-6 tw-min-h-[90vh]">
                {pendingAlerts.length !== 0 && (
                  <PendingAlerts netid={netid} pendingAlerts={pendingAlerts} />
                )}
                <PendingRequests />
                {netid !== '' && (
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

                        if (
                          !Object.prototype.hasOwnProperty.call(
                            partToName,
                            part,
                          )
                        ) {
                          return { title: part.split('?')[0] };
                        }

                        const path =
                          partToName[part].href === undefined
                            ? arr
                                .slice(0, index + 1)
                                .join('/')
                                .replace('#', '')
                            : partToName[part].href;

                        return {
                          title: partToName[part].name,
                          href: partToName[part].clickable
                            ? `#${path}`
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
                    <Dashboard userPrivileges={userPrivileges} netid={netid} />
                  </Route>
                  <Route exact path="/app/linkhubs">
                    <LinkHubDashboard netid={netid} />
                  </Route>
                  <Route
                    exact
                    path="/app/linkhubs/:linkHubId/edit"
                    render={(route) => (
                      <LinkHubEditor linkhubId={route.match.params.linkHubId} />
                    )}
                  />
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
                  <Route
                    exact
                    path="/app/roles/:name"
                    render={(route) => (
                      <Role
                        userPrivileges={userPrivileges}
                        name={route.match.params.name}
                      />
                    )}
                  />
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
            <Footer className="tw-flex tw-justify-center tw-text-center tw-bg-black">
              <Typography.Paragraph className="tw-w-[70%] tw-text-gray-200">
                Rutgers is an equal access/equal opportunity institution.
                Individuals with disabilities are encouraged to direct
                suggestions, comments, or complaints concerning any
                accessibility issues with Rutgers websites to{' '}
                <Link target="_blank" to="mailto:accessibility@rutgers.edu">
                  accessibility@rutgers.edu
                </Link>{' '}
                or complete the{' '}
                <Link
                  target="_blank"
                  to="https://rutgers.ca1.qualtrics.com/jfe/form/SV_57iH6Rfeocz51z0"
                >
                  Report Accessibility Barrier or Provide Feedback Form
                </Link>
                .
              </Typography.Paragraph>
            </Footer>
          </Layout>
        </BrowserRouter>
      </App>
    </ConfigProvider>
  );
}
