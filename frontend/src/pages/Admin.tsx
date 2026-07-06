/**
 * Implements the [[Admin]] component
 * @packageDocumentation
 */

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartLineIcon,
  LockKeyholeIcon,
  ShieldIcon,
  UserIcon,
  Key,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getPendingLinksCount } from '@/api/google-safebrowse';
import AdminStats from '@/components/admin/AdminStats';
import BlockedLinks from '@/components/admin/BlockedLinks';
import Security from '@/components/admin/Security';
import SuperTokens from '@/components/admin/SuperTokens';

import UserLookup from '@/components/admin/UserLookup';
import UsersProvider from '@/contexts/Users';
import {
  adminContentWidthClass,
  adminSectionTopClass,
  adminShellClass,
  adminTabsListClass,
  adminTabTriggerClass,
} from '@/lib/admin-styles';

const VALID_TABS = [
  'analytics',
  'user-lookup',
  'links',
  'security',
  'super-tokens',
];
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
    const syncTabFromLocation = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');

      if (!VALID_TABS.includes(tabParam || '')) {
        searchParams.set('tab', DEFAULT_TAB);
        const normalizedUrl = `${window.location.pathname}?${searchParams.toString()}`;
        window.history.replaceState({}, '', normalizedUrl);
        setActiveTab(DEFAULT_TAB);
      } else {
        setActiveTab(tabParam!);
      }
    };

    window.addEventListener('popstate', syncTabFromLocation);
    syncTabFromLocation();

    return () => window.removeEventListener('popstate', syncTabFromLocation);
  }, []);

  const handleTabChange = (key: string) => {
    if (VALID_TABS.includes(key)) {
      setActiveTab(key);
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set('tab', key);
      window.history.pushState(
        {},
        '',
        `${window.location.pathname}?${searchParams.toString()}`,
      );
    }
  };

  return (
    <div className={adminShellClass}>
      <div className={adminContentWidthClass}>
        <h1 className="app-page-heading text-foreground">
          Administrator Controls
        </h1>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="mt-8"
        >
          <TabsList className={adminTabsListClass}>
            <TabsTrigger value="analytics" className={adminTabTriggerClass}>
              <span className="inline-flex items-center gap-2.5">
                <ChartLineIcon className="h-4 w-4 shrink-0" />
                <span>Analytics</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="user-lookup" className={adminTabTriggerClass}>
              <span className="inline-flex items-center gap-2.5">
                <UserIcon className="h-4 w-4 shrink-0" />
                <span>User Search</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="links" className={adminTabTriggerClass}>
              <span className="inline-flex items-center gap-2.5">
                <ShieldIcon className="h-4 w-4 shrink-0" />
                <span>Link Control</span>
                {linksToBeVerified > 0 && (
                  <Badge className="ml-1 border-0 bg-primary px-1.5 py-0 text-[0.7rem] text-primary-foreground hover:bg-primary">
                    {linksToBeVerified}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="security" className={adminTabTriggerClass}>
              <span className="inline-flex items-center gap-2.5">
                <LockKeyholeIcon className="h-4 w-4 shrink-0" />
                <span>Security</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="super-tokens" className={adminTabTriggerClass}>
              <span className="inline-flex items-center gap-2.5">
                <Key className="h-4 w-4 shrink-0" />
                <span>Super Tokens</span>
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="analytics"
            className={`${adminSectionTopClass} focus-visible:ring-0`}
          >
            <AdminStats />
          </TabsContent>
          <TabsContent
            value="user-lookup"
            className={`${adminSectionTopClass} focus-visible:ring-0`}
          >
            <UsersProvider>
              <UserLookup />
            </UsersProvider>
          </TabsContent>
          <TabsContent
            value="links"
            className={`${adminSectionTopClass} focus-visible:ring-0`}
          >
            <UsersProvider>
              <BlockedLinks />
            </UsersProvider>
          </TabsContent>
          <TabsContent
            value="security"
            className={`${adminSectionTopClass} focus-visible:ring-0`}
          >
            <Security />
          </TabsContent>
          <TabsContent
            value="super-tokens"
            className={`${adminSectionTopClass} focus-visible:ring-0`}
          >
            <SuperTokens />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
