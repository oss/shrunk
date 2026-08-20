/**
 * Implements the [[Admin]] component
 * @packageDocumentation
 */

import { Badge } from '@/Components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import {
  ChartLineIcon,
  LockKeyholeIcon,
  ShieldIcon,
  UserIcon,
  Key,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { getPendingLinksCount } from '@/Api/GoogleSafebrowse';
import { getErrorMessage } from '@/Api/Client';
import AdminStats from '@/Components/Admin/AdminStats';
import BlockedLinks from '@/Components/Admin/BlockedLinks';
import Security from '@/Components/Admin/Security';
import SuperTokens from '@/Components/Admin/SuperTokens';

import UserLookup from '@/Components/Admin/UserLookup';
import UsersProvider from '@/Contexts/Users';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = VALID_TABS.includes(tabParam ?? '')
    ? (tabParam as string)
    : DEFAULT_TAB;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLinksToBeVerified(await getPendingLinksCount());
      } catch (error) {
        setLinksToBeVerified(0);
        toast.error(
          getErrorMessage(error, 'Unable to load the pending-links count.'),
        );
      }
    };

    void fetchData();
  }, []);

  useEffect(() => {
    if (VALID_TABS.includes(tabParam ?? '')) {
      return;
    }

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('tab', DEFAULT_TAB);
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams, tabParam]);

  const handleTabChange = (key: string) => {
    if (VALID_TABS.includes(key)) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('tab', key);
        return next;
      });
    }
  };

  return (
    <div className="-mx-6 min-h-[calc(100dvh-var(--app-header-height,0px))] bg-background px-6 pb-8 text-foreground">
      <div className="mx-auto max-w-[82rem]">
        <h1 className="app-page-heading">Administrator Controls</h1>
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="mt-8"
        >
          <TabsList>
            <TabsTrigger value="analytics">
              <span className="inline-flex items-center gap-2.5">
                <ChartLineIcon className="h-4 w-4 shrink-0" />
                <span>Analytics</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="user-lookup">
              <span className="inline-flex items-center gap-2.5">
                <UserIcon className="h-4 w-4 shrink-0" />
                <span>User Search</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="links">
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
            <TabsTrigger value="security">
              <span className="inline-flex items-center gap-2.5">
                <LockKeyholeIcon className="h-4 w-4 shrink-0" />
                <span>Security</span>
              </span>
            </TabsTrigger>
            <TabsTrigger value="super-tokens">
              <span className="inline-flex items-center gap-2.5">
                <Key className="h-4 w-4 shrink-0" />
                <span>Super Tokens</span>
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="analytics" className="mt-4 focus-visible:ring-0">
            <AdminStats />
          </TabsContent>
          <TabsContent
            value="user-lookup"
            className="mt-4 focus-visible:ring-0"
          >
            <UsersProvider>
              <UserLookup />
            </UsersProvider>
          </TabsContent>
          <TabsContent value="links" className="mt-4 focus-visible:ring-0">
            <UsersProvider>
              <BlockedLinks />
            </UsersProvider>
          </TabsContent>
          <TabsContent value="security" className="mt-4 focus-visible:ring-0">
            <Security />
          </TabsContent>
          <TabsContent
            value="super-tokens"
            className="mt-4 focus-visible:ring-0"
          >
            <SuperTokens />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
