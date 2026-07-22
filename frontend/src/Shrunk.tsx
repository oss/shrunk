/**
 * Implements the [[Shrunk]] component
 * @packageDocumentation
 */

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
  XIcon,
} from 'lucide-react';

import { Toaster, toast } from 'sonner';
import { Fragment, useEffect, useRef, useState, useContext } from 'react';
import {
  BrowserRouter,
  Redirect,
  Route,
  Switch,
  Link,
  useLocation,
} from 'react-router-dom';

import Markdown from 'markdown-to-jsx/react';
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
import OrganizationToken from '@/pages/organization-tokens';
import { DarkModeContext, DarkModeProvider } from '@/contexts/DarkModeContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props {
  siderWidth: number;
}

type ShellNavItem = {
  key: string;
  label: string;
  to?: string;
  icon: JSX.Element;
  onSelect?: () => void;
  destructive?: boolean;
};

function ShrunkContent({
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
  const isDashboardRoute = location.pathname === '/app/dash';
  const isOrganizationsRoute = location.pathname === '/app/orgs';
  const isApiReferenceRoute = location.pathname === '/app/api-reference';
  const isAdminRoute = location.pathname === '/app/admin';
  const isFaqRoute = location.pathname === '/app/faq';
  const isDarkWorkspaceRoute =
    isDashboardRoute ||
    isOrganizationsRoute ||
    isApiReferenceRoute ||
    isAdminRoute ||
    isFaqRoute;
  const [showDeveloperAlert, setShowDeveloperAlert] = useState(true);
  const [dismissedMotd, setDismissedMotd] = useState(false);
  const showMotd =
    motd !== '' &&
    !dismissedMotd &&
    localStorage.getItem('alert-read') !== motd;
  const appHeaderRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const setStickyOffsets = () => {
      const appHeaderHeight = Math.round(
        appHeaderRef.current?.getBoundingClientRect().height ?? 0,
      );

      document.documentElement.style.setProperty(
        '--app-header-height',
        `${appHeaderHeight}px`,
      );
    };

    setStickyOffsets();
    window.addEventListener('resize', setStickyOffsets);

    return () => {
      window.removeEventListener('resize', setStickyOffsets);
    };
  }, [location.pathname]);

  const shellNavItems: ShellNavItem[] = [
    {
      key: 'dash',
      icon: <HomeIcon />,
      label: 'Dashboard',
      to: '/app/dash',
    },
    {
      key: 'orgs',
      icon: <UsersIcon />,
      label: 'My Organizations',
      to: '/app/orgs',
    },
    ...(showAdminTab && featureFlags.helpDesk
      ? [
          {
            key: 'tickets',
            icon: <BugIcon />,
            label: 'Help Desk',
            to: '/app/tickets',
          },
        ]
      : []),
    ...(showAdminTab
      ? [
          {
            key: 'admin-dashboard',
            icon: <LayoutDashboardIcon />,
            label: 'Admin Dashboard',
            to: '/app/admin',
          },
        ]
      : []),
    {
      key: 'api-reference',
      icon: <CodeIcon />,
      label: 'API Reference',
      to: '/app/api-reference',
    },
    {
      key: 'releases',
      icon: <RocketIcon />,
      label: 'Release Notes',
      to: '/app/releases',
    },
    {
      key: 'faq',
      icon: <CircleHelpIcon />,
      label: 'FAQ',
      to: '/app/faq',
    },
    {
      key: 'logout',
      icon: <LogOutIcon />,
      label: 'Logout',
      onSelect: onLogout,
      destructive: true,
    },
  ];

  const primaryNavItems = shellNavItems.filter((item) =>
    ['dash', 'orgs', 'tickets', 'admin-dashboard'].includes(item.key),
  );
  const userDropdownNavItemClass =
    'text-foreground focus:bg-accent focus:text-accent-foreground dark:text-primary-foreground dark:focus:bg-primary-foreground/10 dark:focus:text-primary-foreground dark:[&_svg]:text-primary-foreground';

  const breadcrumbParts = location.pathname.split('/').slice(1);

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
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {domain === 'shrunk.rutgers.edu' && showDeveloperAlert && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-50 text-yellow-950 dark:bg-yellow-950 dark:text-yellow-50">
          <AlertDescription className="flex items-start justify-between gap-4">
            <span>
              This is a developer environment, any progress you make on this
              site is prone to deletion. Please use the real site at{' '}
              <a className="underline" href="https://go.rutgers.edu">
                go.rutgers.edu
              </a>
              .
            </span>
            <Button
              aria-label="Dismiss developer environment warning"
              className="h-6 w-6 shrink-0 p-0"
              variant="ghost"
              size="icon"
              onClick={() => setShowDeveloperAlert(false)}
            >
              <XIcon />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showMotd && (
        <Alert className="rounded-none border-none bg-[#def0f9] dark:bg-[#7DBFD6]">
          <AlertDescription className="flex items-start justify-between gap-4">
            <div>
              <Markdown>{motd}</Markdown>
            </div>
            <Button
              aria-label="Dismiss message of the day"
              className="h-6 w-6 shrink-0 p-0"
              variant="ghost"
              size="icon"
              onClick={() => {
                onAlertClose();
                setDismissedMotd(true);
              }}
            >
              <XIcon />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <header
        ref={appHeaderRef}
        className={cn(
          'sticky top-0 z-50 flex h-20 items-center justify-between border-b px-6 text-primary-foreground',
          isApiReferenceRoute || isFaqRoute
            ? 'border-[#1f1f1f] bg-[#111111]'
            : 'border-border bg-primary dark:bg-[#101010]',
        )}
      >
        <Link
          to={netid ? '/app/dash' : '/app/login'}
          className="flex items-center leading-none"
        >
          <img
            alt="Rutgers"
            src={rutgersLogo}
            srcSet={rutgersLogo}
            className="block w-[205px]"
          />
        </Link>
        <div className="flex items-center gap-2">
          {netid && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-sm font-semibold text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  disabled={isLoading}
                >
                  {netid}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-border bg-popover text-popover-foreground shadow-md dark:border-primary-foreground/10"
              >
                <DropdownMenuLabel className="text-center text-muted-foreground dark:text-primary-foreground/70">
                  {netid} ({role})
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border dark:bg-primary-foreground/10" />
                {primaryNavItems.map((item) => (
                  <DropdownMenuItem
                    key={item.key}
                    className={userDropdownNavItemClass}
                    asChild
                  >
                    <Link to={item.to ?? '/app/dash'}>
                      {item.icon}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-border dark:bg-primary-foreground/10" />
                <DropdownMenuItem className={userDropdownNavItemClass} asChild>
                  <Link to="/app/api-reference">
                    <CodeIcon />
                    API Reference
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border dark:bg-primary-foreground/10" />
                <DropdownMenuItem className={userDropdownNavItemClass} asChild>
                  <Link to="/app/releases">
                    <RocketIcon />
                    Release Notes
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className={userDropdownNavItemClass} asChild>
                  <Link to="/app/faq">
                    <CircleHelpIcon />
                    FAQ
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border dark:bg-primary-foreground/10" />
                <DropdownMenuItem
                  className="text-[#DC4446] focus:bg-[#DC4446] focus:text-destructive-foreground"
                  onSelect={onLogout}
                >
                  <LogOutIcon />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Theme: ${currentThemeLabel}`}
                  className="text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  onClick={handleThemeButtonClick}
                >
                  {currentThemeIcon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{currentThemeLabel}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 2xl:grid-cols-[150px_minmax(0,1fr)_150px]">
        <aside className="hidden 2xl:block" />
        <main
          className={cn(
            'min-h-0 flex-1',
            isApiReferenceRoute
              ? 'overflow-hidden bg-[#1A1A1A] px-6 pt-0 pb-6 text-[#efefef]'
              : isAdminRoute
                ? 'px-6 pt-0 pb-6'
                : isFaqRoute
                  ? 'overflow-hidden bg-[#1A1A1A] px-6 pt-0 pb-6 text-[#efefef]'
                  : isDarkWorkspaceRoute
                    ? 'overflow-hidden bg-background px-3 text-foreground sm:px-4 md:px-6'
                    : 'px-6 pt-0 pb-6',
          )}
        >
          <PendingRequests />

          {netid !== '' && isApp && !isDashboardRoute && (
            <Breadcrumb
              className={cn(
                'mt-6 mb-4',
                (isApiReferenceRoute || isFaqRoute) &&
                  'text-[#b8b8b8] [&_[aria-current=page]]:text-[#f1f1f1] [&_a]:text-[#b8b8b8] [&_a:hover]:text-[#f1f1f1] [&_li[role=presentation]]:text-[#8f8f8f]',
              )}
            >
              <BreadcrumbList>
                {breadcrumbParts.map(
                  (part: string, index: number, arr: string[]) => {
                    const isLastItem = index === arr.length - 1;

                    let label = part;
                    let href = `/${arr.slice(0, index + 1).join('/')}`;
                    let clickable = false;

                    if (part === 'app') {
                      label = 'Home';
                      href = '/app/dash';
                      clickable = true;
                    } else if (part in partToName) {
                      label = partToName[part].name;
                      href =
                        partToName[part].href === undefined
                          ? `/${arr.slice(0, index + 1).join('/')}`
                          : `/${partToName[part].href}`;
                      clickable = partToName[part].clickable;
                    }

                    return (
                      <Fragment key={`${part}-${index}`}>
                        <BreadcrumbItem>
                          {isLastItem || !clickable ? (
                            <BreadcrumbPage>{label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild>
                              <Link to={href}>{label}</Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                        {!isLastItem && <BreadcrumbSeparator />}
                      </Fragment>
                    );
                  },
                )}
              </BreadcrumbList>
            </Breadcrumb>
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
        </main>
        <aside className="hidden 2xl:block" />
      </div>

      <footer className="flex justify-center bg-black p-6 text-center">
        <p className="w-[70%] text-primary-foreground/90">
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
        </p>
      </footer>
    </div>
  );
}

export default function Shrunk(_props: Props) {
  const featureFlags: FeatureFlags = useFeatureFlags();

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
        toast.error(`Something went wrong. ${error}`);
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
              <div className={darkMode ? 'dark' : ''}>
                <BrowserRouter>
                  <ShrunkContent
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
                <Toaster />
              </div>
            </FeatureFlagsProvider>
          );
        }}
      </DarkModeContext.Consumer>
    </DarkModeProvider>
  );
}
