import {
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
import { Fragment, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import Markdown from 'markdown-to-jsx';

import { DarkModeContext } from '@/App/DarkModeContext';
import rutgersLogo from '@/Assets/Images/rutgers.png';
import { Alert, AlertDescription } from '@/Shared/ui/alert';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/Shared/ui/breadcrumb';
import { Button } from '@/Shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Shared/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/Shared/ui/tooltip';
import { cn } from '@/Shared/Lib/Utils';
import { useSession } from '@/App/useSession';

type ShellNavItem = {
  key: string;
  label: string;
  to?: string;
  icon: React.JSX.Element;
  onSelect?: () => void;
  destructive?: boolean;
};

export function Shell({ children }: { children: ReactNode }) {
  const { netid, privileges, isLoading, motd, logout } = useSession();
  const { darkMode, setDarkMode, isFollowingSystem } =
    useContext(DarkModeContext);
  const location = useLocation();

  const domain = window.location.hostname;

  const showAdminTab = privileges.has('admin');
  const role =
    privileges.size === 0
      ? 'Whitelisted User'
      : privileges.has('power_user')
        ? 'Power User'
        : privileges.has('facstaff')
          ? 'Faculty'
          : privileges.has('guest')
            ? 'Guest User'
            : 'Administrator';

  const partToName: {
    [key: string]: { name: string; clickable: boolean; href?: string };
  } = {
    dash: { name: 'URL Shortener', clickable: true },
    orgs: { name: 'My Organizations', clickable: true },
    admin: { name: 'Admin Dashboard', clickable: true },
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
      onSelect: logout,
      destructive: true,
    },
  ];

  const primaryNavItems = shellNavItems.filter((item) =>
    ['dash', 'orgs', 'admin-dashboard'].includes(item.key),
  );
  const userDropdownNavItemClass =
    'cursor-pointer text-foreground focus:bg-accent focus:text-accent-foreground dark:text-primary-foreground dark:focus:bg-primary-foreground/10 dark:focus:text-primary-foreground dark:[&_svg]:text-primary-foreground';

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

  const onAlertClose = (): void => {
    if (motd === '') {
      return;
    }

    localStorage.setItem('alert-read', motd);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-foreground"
      >
        Skip to main content
      </a>
      {domain === 'shrunk.rutgers.edu' && showDeveloperAlert && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-50 text-yellow-950 dark:bg-yellow-950 dark:text-yellow-50">
          <AlertDescription className="flex items-start justify-between gap-4 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2">
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
        <Alert className="rounded-none border-none bg-info text-info-foreground">
          <AlertDescription className="flex items-start justify-between gap-4 text-info-foreground [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2">
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
          'border-border bg-primary dark:bg-background',
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
                  aria-label="Open account menu"
                  className="cursor-pointer text-sm font-semibold text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  disabled={isLoading}
                >
                  {netid}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-border bg-popover text-popover-foreground shadow-md"
              >
                <DropdownMenuLabel className="cursor-not-allowed text-center text-muted-foreground dark:text-primary-foreground/70">
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
                  aria-label="Logout"
                  className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground"
                  onSelect={logout}
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
                  className="cursor-pointer text-primary-foreground/90 hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
          id="main-content"
          className={cn(
            'min-h-0 flex-1',
            isDashboardRoute
              ? 'bg-background px-3 text-foreground sm:px-4 md:px-6'
              : isApiReferenceRoute
                ? 'overflow-hidden bg-background px-6 pt-0 pb-6 text-foreground'
                : isAdminRoute
                  ? 'px-6 pt-0 pb-6'
                  : isFaqRoute
                    ? 'overflow-hidden bg-background px-6 pt-0 pb-6 text-foreground'
                    : isDarkWorkspaceRoute
                      ? 'overflow-hidden bg-background px-3 text-foreground sm:px-4 md:px-6'
                      : 'px-6 pt-0 pb-6',
          )}
        >
          {netid !== '' && isApp && !isDashboardRoute && (
            <Breadcrumb
              className={cn(
                'mt-6 mb-4',
                isApiReferenceRoute &&
                  'text-muted-foreground [&_[aria-current=page]]:text-foreground [&_a]:text-muted-foreground [&_a:hover]:text-foreground [&_li[role=presentation]]:text-muted-foreground',
                isFaqRoute &&
                  'text-muted-foreground [&_[aria-current=page]]:text-foreground [&_a]:text-muted-foreground [&_a:hover]:text-foreground [&_li[role=presentation]]:text-muted-foreground',
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

          {children}
        </main>
        <aside className="hidden 2xl:block" />
      </div>

      <footer className="flex justify-center bg-black p-6 text-center">
        <p className="w-[70%] bg-black text-white">
          Rutgers is an equal access/equal opportunity institution. Individuals
          with disabilities are encouraged to direct suggestions, comments, or
          complaints concerning any accessibility issues with Rutgers websites
          to{' '}
          <a
            target="_blank"
            rel="noreferrer"
            href="mailto:accessibility@rutgers.edu"
            className="underline underline-offset-2"
          >
            accessibility@rutgers.edu
          </a>{' '}
          or complete the{' '}
          <a
            target="_blank"
            rel="noreferrer"
            href="https://rutgers.ca1.qualtrics.com/jfe/form/SV_57iH6Rfeocz51z0"
            className="underline underline-offset-2"
          >
            Report Accessibility Barrier or Provide Feedback Form
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
