/**
 * Implements the [[Shrunk]] component
 * @packageDocumentation
 */

/* eslint-disable react/jsx-no-bind */

import {
  BugIcon,
  CircleHelpIcon,
  CodeIcon,
  HomeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  Moon,
  RocketIcon,
  Sun,
  SunMoon,
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
  Tooltip,
  Typography,
  message,
} from 'antd';
import React, { useEffect, useState, useContext } from 'react';
import {
  BrowserRouter,
  Redirect,
  Route,
  Switch,
  Link,
  useLocation,
} from 'react-router-dom';

import Markdown from 'markdown-to-jsx';
import Admin from '@/pages/Admin';
import Dashboard from '@/pages/Dashboard';
import Faq from '@/pages/Faq';
import ApiReference from '@/pages/ApiReference';
import MyOrganizations from '@/pages/organizations';

import Login from '@/pages/Login';
import ManageOrg from '@/pages/organization-manage';
import { Stats } from '@/pages/subpages/Stats';

import { PendingRequests } from '@/modals/PendingRequests';

import ErrorPage from '@/pages/ErrorPage';
import HelpDesk from '@/pages/HelpDesk';

import { getUserInfo, logout } from '@/api/app';
import { FeatureFlagsProvider, useFeatureFlags } from '@/contexts/FeatureFlags';
import rutgersLogo from '@/images/rutgers.png';
import { FeatureFlags } from '@/interfaces/app';
import ChangeLog from '@/pages/ChangeLog';
import Ticket from '@/pages/subpages/Ticket';
import { darkTheme, lightTheme } from '@/theme';
import OrganizationToken from '@/pages/organization-tokens';
import { DarkModeContext, DarkModeProvider } from '@/contexts/DarkModeContext';

const { Header, Content, Footer, Sider } = Layout;

interface Props {
  siderWidth: number;
}

function ShrunkContent({
  siderWidth,
  netid,
  userPrivileges,
  isLoading,
  motd,
  showAdminTab,
  role,
  onLogout,
  onAlertClose,
  ProtectedRoute,
  featureFlags,
}: {
  siderWidth: number;
  netid: string;
  userPrivileges: Set<string>;
  isLoading: boolean;
  motd: string;
  showAdminTab: boolean;
  role: string;
  onLogout: () => Promise<void>;
  onAlertClose: () => void;
  ProtectedRoute: (props: {
    children: any;
    requiredPrivilege: string;
  }) => JSX.Element;
  featureFlags: FeatureFlags;
}) {
  const darkModeContext = useContext(DarkModeContext);

  if (!darkModeContext) {
    throw new Error('DarkModeContext is missing.');
  }

  const { darkMode, setDarkMode, isFollowingSystem } = darkModeContext;
  const location = useLocation();

  const domain = window.location.hostname;

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

  const isApp = location.pathname.split('/').slice(1)[0] === 'app';
  const showMotd = motd !== '' && localStorage.getItem('alert-read') !== motd;

  const menuItems: any[] = [
    {
      key: 'role-status',
      disabled: true,
      label: (
        <p className="tw-m-0 tw-text-center !tw-text-gray-300">
          {netid} ({role})
        </p>
      ),
    },
    { type: 'divider' },
    {
      key: 'dash',
      icon: <HomeIcon color={darkMode ? '#ffffff' : '#000000'} />,
      label: <Link to="/app/dash"> Dashboard </Link>,
    },
    {
      key: 'orgs',
      icon: (
        <UsersIcon
          className={darkMode ? '!tw-text-white' : '!tw-text-black'}
          color={darkMode ? '#ffffff' : '#000000'}
        />
      ),
      label: (
        <Link
          className={darkMode ? '!tw-text-white' : '!tw-text-black'}
          to="/app/orgs"
        >
          My Organizations
        </Link>
      ),
    },
    ...(showAdminTab && featureFlags.helpDesk
      ? [
          {
            key: 'tickets',
            icon: <BugIcon color={darkMode ? '#ffffff' : '#000000'} />,
            label: (
              <Link
                className={darkMode ? '!tw-text-white' : '!tw-text-black'}
                to="/app/tickets"
              >
                Help Desk
              </Link>
            ),
          },
        ]
      : []),
    ...(showAdminTab
      ? [
          {
            key: 'admin-dashboard',
            icon: (
              <LayoutDashboardIcon color={darkMode ? '#ffffff' : '#000000'} />
            ),
            label: (
              <Link
                className={darkMode ? '!tw-text-white' : '!tw-text-black'}
                to="/app/admin"
              >
                Admin Dashboard
              </Link>
            ),
          },
        ]
      : []),
    { type: 'divider' },
    {
      key: 'api-reference',
      icon: <CodeIcon color={darkMode ? '#ffffff' : '#000000'} />,
      label: (
        <Link
          className={darkMode ? '!tw-text-white' : '!tw-text-black'}
          to="/app/api-reference"
        >
          API Reference
        </Link>
      ),
    },
    { type: 'divider' },
    {
      key: 'releases',
      icon: <RocketIcon color={darkMode ? '#ffffff' : '#000000'} />,
      label: (
        <Link
          className={darkMode ? '!tw-text-white' : '!tw-text-black'}
          to="/app/releases"
        >
          Release Notes
        </Link>
      ),
    },
    {
      key: 'faq',
      icon: <CircleHelpIcon color={darkMode ? '#ffffff' : '#000000'} />,
      label: (
        <Link
          className={darkMode ? '!tw-text-white' : '!tw-text-black'}
          to="/app/faq"
        >
          FAQ
        </Link>
      ),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogOutIcon />,
      onClick: onLogout,
      label: 'Logout',
      danger: true,
      className: '!tw-text-red-600 hover:!tw-text-white',
    },
  ];

  const currentThemeKey = isFollowingSystem
    ? 'system'
    : darkMode
    ? 'dark'
    : 'light';

  const currentThemeIcon = isFollowingSystem ? (
    <SunMoon />
  ) : darkMode ? (
    <Moon />
  ) : (
    <Sun />
  );
  const currentThemeLabel = isFollowingSystem
    ? 'System Preference'
    : darkMode
    ? 'Dark'
    : 'Light';

  const handleThemeButtonClick = () => {
    if (currentThemeKey === 'light') {
      setDarkMode('dark');
      return;
    }

    if (currentThemeKey === 'dark') {
      setDarkMode('system');
      return;
    }

    setDarkMode('light');
  };

  return (
    <Layout>
      {domain === 'shrunk.rutgers.edu' && (
        <Alert
          title={
            <Typography.Text>
              This is a developer environment, any progress you make on this
              site is prone to deletion. Please use the real site at{' '}
              <a href="https://go.rutgers.edu">go.rutgers.edu</a>.
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
          title={<Markdown>{motd}</Markdown>}
          type="info"
          showIcon
          closable
          onClose={onAlertClose}
          banner
        />
      )}

      <Header className="tw-flex tw-items-center tw-justify-between">
        <Link to={netid ? '/app/dash' : '/app/login'}>
          <Image
            preview={false}
            alt="Rutgers"
            src={rutgersLogo}
            width="175px"
            srcSet={rutgersLogo}
          />
        </Link>
        <div className="tw-flex tw-items-center tw-gap-2">
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
          <Tooltip title={currentThemeLabel} placement="bottom">
            <Button
              icon={currentThemeIcon}
              type="text"
              aria-label={`Theme: ${currentThemeLabel}`}
              className="tw-flex tw-h-9 tw-w-9 tw-items-center tw-justify-center tw-p-0 !tw-text-white"
              onClick={handleThemeButtonClick}
            />
          </Tooltip>
        </div>
      </Header>

      <Layout>
        <Sider width={siderWidth} breakpoint="xxl" collapsedWidth="10" />
        <Content className="tw-m-0 tw-min-h-[90vh] tw-p-6">
          <PendingRequests />

          {netid !== '' && isApp && (
            <Breadcrumb
              items={location.pathname
                .split('/')
                .slice(1)
                .map((part, index, arr) => {
                  if (part === 'app') {
                    return {
                      title: <Link to="/app/dash">Home</Link>,
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

                  const isClickable = partToName[part].clickable;
                  const isLastItem = index === arr.length - 1;

                  if (isLastItem || !isClickable) {
                    return {
                      title: partToName[part].name,
                    };
                  }

                  return {
                    title: <Link to={`/${path}`}>{partToName[part].name}</Link>,
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
              <Dashboard userPrivileges={userPrivileges} />
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
              <ManageOrg userNetid={netid} userPrivileges={userPrivileges} />
            </Route>
            <Route exact path="/app/orgs/:id/tokens">
              <OrganizationToken />
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
        <Sider width={siderWidth} breakpoint="xxl" collapsedWidth="10" />
      </Layout>

      <Footer className="tw-flex tw-justify-center tw-bg-black tw-text-center">
        <Typography.Paragraph className="tw-w-[70%] tw-text-gray-200">
          Rutgers is an equal access/equal opportunity institution. Individuals
          with disabilities are encouraged to direct suggestions, comments, or
          complaints concerning any accessibility issues with Rutgers websites
          to{' '}
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
  );
}

export default function Shrunk(props: Props) {
  const featureFlags: FeatureFlags = useFeatureFlags();

  const { siderWidth } = props;

  const [userPrivileges, setUserPrivileges] = useState<Set<string>>(new Set());
  const [netid, setNetid] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [motd, setMotd] = useState<string>('');

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

  const onAlertClose = (): void => {
    if (motd === '') {
      return;
    }

    localStorage.setItem('alert-read', motd);
  };

  if (
    !isLoading &&
    window.location.pathname !== '/app/login' &&
    netid === '' &&
    window.location.pathname.split('/')[1] === 'app'
  ) {
    window.location.href = '/app/login';
  }

  return (
    <DarkModeProvider>
      <DarkModeContext.Consumer>
        {(darkModeContext) => {
          if (!darkModeContext) {
            return null;
          }

          const { darkMode } = darkModeContext;

          return (
            <FeatureFlagsProvider>
              <ConfigProvider theme={darkMode ? darkTheme : lightTheme}>
                <App className={darkMode ? 'tw-dark' : ''}>
                  <BrowserRouter>
                    <ShrunkContent
                      siderWidth={siderWidth}
                      netid={netid}
                      userPrivileges={userPrivileges}
                      isLoading={isLoading}
                      motd={motd}
                      showAdminTab={showAdminTab}
                      role={role}
                      onLogout={onLogout}
                      onAlertClose={onAlertClose}
                      ProtectedRoute={ProtectedRoute}
                      featureFlags={featureFlags}
                    />
                  </BrowserRouter>
                </App>
              </ConfigProvider>
            </FeatureFlagsProvider>
          );
        }}
      </DarkModeContext.Consumer>
    </DarkModeProvider>
  );
}
