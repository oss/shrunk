/**
 * Implements the [[Shrunk]] component
 * @packageDocumentation
 */

import {
  BookOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  MenuOutlined,
  SafetyOutlined,
  SlidersOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  ConfigProvider,
  Dropdown,
  Image,
  Layout,
  Menu,
  Row,
  Space,
  Tag,
  Typography,
  theme,
} from 'antd/lib';
import { createBrowserHistory, Location } from 'history';
import React, { useEffect, useState } from 'react';
import {
  HashRouter,
  Link,
  NavLink,
  Redirect,
  Route,
  Switch,
} from 'react-router-dom';

import base32 from 'hi-base32';
import { Admin } from './pages/Admin';
import { Dashboard } from './pages/Dashboard';
import Faq from './pages/Faq';
import { Orgs } from './pages/Orgs';
import { RoleRequestForm } from './pages/RoleRequestForm';

import { AdminStats } from './components/admin/AdminStats';
import LinkSecurity from './components/admin/LinkSecurity';
import { PendingRoleRequests } from './components/admin/PendingRoleRequests';
import { Role } from './components/admin/Role';
import UserLookup from './components/admin/UserLookup';
import { ManageOrg } from './pages/subpages/ManageOrg';
import { OrgStats } from './pages/subpages/OrgStats';
import { Stats } from './pages/subpages/Stats';

import { PendingAlerts } from './modals/PendingAlerts';
import { PendingRequests } from './modals/PendingRequests';

import { lightTheme } from './theme';
import LinkHubDashboard from './pages/LinkHubDashboard';
import LinkHubEditor from './pages/subpages/LinkHubEditor';
import UsersProvider from './contexts/Users';

const { Header, Content, Footer, Sider } = Layout;

export interface Props {
  /**
   * NetID of the user.
   * @property
   */
  netid: string;

  /**
   * Width of the siders in the layout.
   * @property
   */
  siderWidth: number;

  /**
   * A set of the user's privileges.
   * @property
   */
  userPrivileges: Set<string>;
}

export default function Shrunk(props: Props) {
  const { netid, siderWidth, userPrivileges } = props;
  const { token } = theme.useToken();

  const showAdminTab = userPrivileges.has('admin');
  const showWhitelistTab = !showAdminTab && userPrivileges.has('facstaff');
  const role =
    userPrivileges.size === 0
      ? 'Whitelisted User'
      : userPrivileges.has('power_user')
      ? 'Power User'
      : userPrivileges.has('facstaff')
      ? 'Faculty/Staff'
      : 'Administrator';

  const [selectedKeys, setSelectedKeys] = useState<string[]>(['dash']);
  const [pendingAlerts, setPendingAlerts] = useState<string[]>([]);
  const [powerUserRoleRequestMade, setPowerUserRoleRequestMade] =
    useState(false);
  const [isLinkHubEnabled, setIsLinkHubEnabled] = useState(false);
  const [isRoleRequestsEnabled, setIsRoleRequestsEnabled] = useState(false);

  const fetchIsLinkHubEnabled = async () => {
    const resp = await fetch('/api/v1/linkhub/is-linkhub-enabled');
    const json = await resp.json();
    setIsLinkHubEnabled(json.status as boolean);
  };

  const fetchRoleRequestsEnabled = async () => {
    const resp = await fetch('/api/v1/role_request/role_requests_enabled');
    const json = await resp.json();
    setIsRoleRequestsEnabled(json.role_requests_enabled as boolean);
  };

  const updatePendingAlerts = async () => {
    const resp = await fetch(`/api/v1/alert/${netid}`);
    const json = await resp.json();
    setPendingAlerts(json.pending_alerts as string[]);
  };

  const updatePowerUserRoleRequestMade = async () => {
    const encodedEntity = base32.encode(netid);
    try {
      const response = await fetch(
        `/api/v1/role_request/power_user/${encodedEntity}`,
      );
      if (response.status === 200) {
        setPowerUserRoleRequestMade(true);
      } else if (response.status === 204) {
        setPowerUserRoleRequestMade(false);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const setSelectedKeysFromLocation = (location: Location) => {
    const route = location.hash;
    let key: string | null = null;
    if (route.startsWith('#/dash') || route.startsWith('#/stats')) {
      key = 'dash';
    } else if (route.startsWith('#/linkhubs')) {
      key = 'linkhubs';
    } else if (route.startsWith('#/orgs')) {
      key = 'orgs';
    } else if (route.startsWith('#/admin')) {
      key = 'admin';
    } else if (route.startsWith('#/roles')) {
      if (showWhitelistTab) {
        key = 'whitelist';
      } else {
        key = 'admin';
      }
    } else if (route.startsWith('#/request-power-user-role')) {
      key = 'request-power-user-role';
    } else if (route.startsWith('#/faq')) {
      key = 'faq';
    }

    if (key === null) {
      throw new Error(`unknown route ${route}`);
    }

    setSelectedKeys([key]);
  };

  useEffect(() => {
    const init = async () => {
      await fetchIsLinkHubEnabled();
      await updatePendingAlerts();
      await fetchRoleRequestsEnabled();
      await updatePowerUserRoleRequestMade();

      const history = createBrowserHistory();
      setSelectedKeysFromLocation(history.location);
      history.listen(({ location }) => setSelectedKeysFromLocation(location));
    };

    init();
  }, []);

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
      label: <NavLink to="/orgs">My Organizations</NavLink>,
    },
    ...(role === 'Administrator' ||
    role === 'Power User' ||
    !isRoleRequestsEnabled
      ? []
      : [
          { type: 'divider' },
          powerUserRoleRequestMade
            ? {
                key: 'request-power-user-role',
                icon: <ClockCircleOutlined />,
                label: 'Pending Request',
                disabled: true,
              }
            : {
                key: 'request-power-user-role',
                icon: <SafetyOutlined />,
                label: (
                  <NavLink to="/request-power-user-role">
                    Request Power User Role
                  </NavLink>
                ),
              },
        ]),
    ...(showAdminTab
      ? [
          {
            key: 'admin-dashboard',
            icon: <SlidersOutlined />,
            label: <NavLink to="/admin">Admin Dashboard</NavLink>,
          },
        ]
      : []),
    { type: 'divider' },
    {
      key: 'feedback',
      icon: <BulbOutlined />,
      label: (
        <a
          href="https://forms.gle/Gv1L1bNZWtLS21wW8"
          target="_blank"
          rel="noopener noreferrer"
        >
          Feedback
        </a>
      ),
    },
    {
      key: 'faq',
      icon: <BookOutlined />,
      label: <NavLink to="/faq">FAQ</NavLink>,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <a href="/app/logout">Logout</a>,
    },
  ];

  return (
    <ConfigProvider theme={lightTheme}>
      <HashRouter>
        <Layout>
          <Header>
            <Row gutter={16}>
              <Col>
                <Link to="/dash">
                  <Image
                    preview={false}
                    alt="Rutgers"
                    src="/static/img/rutgers.png"
                    width="175px"
                    srcSet="/static/img/rutgers.png"
                  />
                </Link>
              </Col>
              <Col flex="auto">
                <Menu
                  overflowedIndicator={<MenuOutlined />}
                  mode="horizontal"
                  selectedKeys={selectedKeys}
                >
                  <Menu.Item key="dash">
                    <NavLink to="/dash">URL Shortener</NavLink>
                  </Menu.Item>
                  {isLinkHubEnabled ? (
                    <Menu.Item key="linkhubs">
                      <NavLink to="/linkhubs">
                        LinkHub <Tag color="warning">beta</Tag>
                      </NavLink>
                    </Menu.Item>
                  ) : (
                    <></>
                  )}
                  {!showWhitelistTab ? (
                    <></>
                  ) : (
                    <Menu.Item key="whitelist">
                      <NavLink to="/roles/whitelisted">Whitelist</NavLink>
                    </Menu.Item>
                  )}
                </Menu>
              </Col>
              <Col>
                <Dropdown menu={{ items: menuItems }}>
                  <Button type="text" style={{ color: 'white' }}>
                    {props.netid}
                  </Button>
                </Dropdown>
              </Col>
            </Row>
          </Header>
          <Layout>
            <Sider width={siderWidth} breakpoint="xl" collapsedWidth="10" />
            <Content
              style={{
                padding: 24,
                margin: 0,
                minHeight: '90vh',
              }}
            >
              {pendingAlerts.length === 0 ? (
                <></>
              ) : (
                <PendingAlerts netid={netid} pendingAlerts={pendingAlerts} />
              )}
              <PendingRequests />
              <Switch>
                <Route exact path="/">
                  <Redirect to="/dash" />
                </Route>

                <Route exact path="/dash">
                  <Dashboard userPrivileges={userPrivileges} netid={netid} />
                </Route>

                <Route exact path="/linkhubs">
                  <LinkHubDashboard netid={netid} />
                </Route>

                <Route
                  exact
                  path="/linkhubs/:linkHubId/edit"
                  render={(props) => (
                    <LinkHubEditor linkhubId={props.match.params.linkHubId} />
                  )}
                />

                <Route
                  exact
                  path="/stats/:id"
                  render={(props) => (
                    <Stats
                      id={props.match.params.id}
                      netid={netid}
                      userPrivileges={userPrivileges}
                    />
                  )}
                />

                <Route exact path="/orgs">
                  <Orgs userPrivileges={userPrivileges} />
                </Route>

                <Route exact path="/orgs/:id/manage">
                  <ManageOrg
                    userNetid={netid}
                    userPrivileges={userPrivileges}
                  />
                </Route>

                <Route
                  exact
                  path="/orgs/:id/stats"
                  render={(props) => <OrgStats id={props.match.params.id} />}
                />

                {isRoleRequestsEnabled && (
                  <Route exact path="/request-power-user-role">
                    {!powerUserRoleRequestMade &&
                      !userPrivileges.has('admin') &&
                      !userPrivileges.has('power_user') && (
                        <RoleRequestForm netid={netid} name="power_user" />
                      )}
                  </Route>
                )}

                <Route exact path="/faq">
                  <Faq />
                </Route>

                <Route
                  exact
                  path="/roles/:name"
                  render={(props) => (
                    <Role
                      userPrivileges={userPrivileges}
                      name={props.match.params.name}
                    />
                  )}
                />

                {!showAdminTab ? (
                  <></>
                ) : (
                  <>
                    <Route exact path="/admin">
                      <Admin />
                    </Route>
                    <Route exact path="/admin/stats">
                      <AdminStats />
                    </Route>
                    <Route exact path="/admin/user_lookup">
                      <UsersProvider>
                        <UserLookup />
                      </UsersProvider>
                    </Route>
                    <Route exact path="/admin/link_security">
                      <LinkSecurity />
                    </Route>
                    <Route exact path="/admin/role_requests/power_user">
                      <PendingRoleRequests
                        name="power_user"
                        userPrivileges={userPrivileges}
                      />
                    </Route>
                  </>
                )}
              </Switch>
            </Content>
            <Sider width={siderWidth} breakpoint="xl" collapsedWidth="10" />
          </Layout>
          <Footer
            style={{
              display: 'flex',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Typography.Paragraph style={{ width: '70%' }}>
              Rutgers is an equal access/equal opportunity institution.
              Individuals with disabilities are encouraged to direct
              suggestions, comments, or complaints concerning any accessibility
              issues with Rutgers websites to{' '}
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
      </HashRouter>
    </ConfigProvider>
  );
}
