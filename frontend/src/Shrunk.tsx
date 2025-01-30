/**
 * Implements the [[Shrunk]] component
 * @packageDocumentation
 */

import {
  BookOutlined,
  BugOutlined,
  BulbOutlined,
  LogoutOutlined,
  MenuOutlined,
  SlidersOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
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
  Alert,
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

import Admin from './pages/Admin';
import { Dashboard } from './pages/Dashboard';
import Faq from './pages/Faq';
import Orgs from './pages/Orgs';

import { Role } from './components/admin/Role';
import ManageOrg from './pages/subpages/ManageOrg';
import { Stats } from './pages/subpages/Stats';

import { PendingAlerts } from './modals/PendingAlerts';
import { PendingRequests } from './modals/PendingRequests';

import AdminHelpDesk from './components/admin/AdminHelpDesk';
import Domains from './components/admin/Domains';
import UsersProvider from './contexts/Users';
import HelpDesk from './pages/HelpDesk';
import LinkHubDashboard from './pages/LinkHubDashboard';
import LinkHubEditor from './pages/subpages/LinkHubEditor';

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

  const showAdminTab = userPrivileges.has('admin');
  const showWhitelistTab = !showAdminTab && userPrivileges.has('facstaff');
  const role =
    userPrivileges.size === 0
      ? 'Whitelisted User'
      : userPrivileges.has('power_user')
      ? 'Power User'
      : userPrivileges.has('facstaff')
      ? 'Faculty'
      : 'Administrator';

  const [selectedKeys, setSelectedKeys] = useState<string[]>(['dash']);
  const [pendingAlerts, setPendingAlerts] = useState<string[]>([]);
  const [isLinkHubEnabled, setIsLinkHubEnabled] = useState(false);
  const [isDomainEnabled, setIsDomainEnabled] = useState(false);
  const [isHelpDeskEnabled, setIsHelpDeskEnabled] = useState(false);
  const [isRoleRequestsEnabled, setIsRoleRequestsEnabled] = useState(false);

  const fetchIsLinkHubEnabled = async () => {
    const resp = await fetch('/api/v1/linkhub/is-linkhub-enabled');
    const json = await resp.json();
    setIsLinkHubEnabled(json.status as boolean);
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

  const setSelectedKeysFromLocation = (location: Location) => {
    const route = location.hash;
    let key: string | null = null;
    if (route.startsWith('#/dash') || route.startsWith('#/links')) {
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
    } else if (route.startsWith('#/help')) {
      key = 'help';
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
      await fetchIsHelpDeskEnabled();
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
    ...(!showAdminTab && isHelpDeskEnabled
      ? [
          {
            key: 'help',
            icon: <BugOutlined />,
            label: <NavLink to="/help">Help Desk</NavLink>,
          },
        ]
      : []),
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

  const { location } = createBrowserHistory();
  const { hash } = location;

  const domain = window.location.hostname;

  // setSelectedKeysFromLocation() is scheduled to be deleted soon.
  const partToName: {
    [key: string]: { name: string; clickable: boolean; href?: string };
  } = {
    dash: { name: 'URL Shortener', clickable: true },
    linkhubs: { name: 'LinkHub', clickable: false },
    orgs: { name: 'My Organizations', clickable: true },
    admin: { name: 'Admin Dashboard', clickable: true },
    help: { name: 'Help Desk', clickable: true },
    roles: { name: 'Role', clickable: false },
    faq: { name: 'FAQ', clickable: true },
    links: { name: 'Links', clickable: false },
  };

  return (
    <ConfigProvider theme={lightTheme}>
      <HashRouter>
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
              <Breadcrumb
                items={hash.split('/').map((part, index, arr) => {
                  if (part === '#') {
                    return {
                      title: 'Home',
                      href: '/#',
                    };
                  }

                  if (!Object.prototype.hasOwnProperty.call(partToName, part)) {
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
                    href: partToName[part].clickable ? `#${path}` : undefined,
                  };
                })}
              />
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
                  render={(route) => (
                    <LinkHubEditor linkhubId={route.match.params.linkHubId} />
                  )}
                />

                <Route
                  exact
                  path="/links/:id"
                  render={(route) => (
                    <Stats
                      id={route.match.params.id}
                      netid={netid}
                      userPrivileges={userPrivileges}
                    />
                  )}
                />

                <Route exact path="/orgs">
                  <Orgs userPrivileges={userPrivileges} />
                </Route>

                <Route exact path="/orgs/:id">
                  <ManageOrg
                    userNetid={netid}
                    userPrivileges={userPrivileges}
                  />
                </Route>

                {!showAdminTab && isHelpDeskEnabled && (
                  <Route exact path="/help">
                    <HelpDesk netid={netid} />
                  </Route>
                )}

                <Route exact path="/faq">
                  <Faq />
                </Route>

                <Route
                  exact
                  path="/roles/:name"
                  render={(route) => (
                    <Role
                      userPrivileges={userPrivileges}
                      name={route.match.params.name}
                    />
                  )}
                />

                <Route exact path="/admin">
                  <Admin />
                </Route>
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
