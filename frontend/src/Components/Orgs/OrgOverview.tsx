import { useEffect, useState } from 'react';

import { getOrganizationStats } from '@/Api/Organization';
import { getErrorMessage } from '@/Api/Client';
import { OrganizationStats } from '@/Interfaces/Organizations';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';

interface OrgOverviewProps {
  orgId: string;
  totalMembers: number;
  isMobile?: boolean;
  orientation?: 'grid' | 'stacked';
}

function StatCard({
  title,
  value,
  isLoading,
  compact,
}: {
  title: string;
  value: number | undefined;
  isLoading: boolean;
  compact: boolean;
}) {
  return (
    <Card className={compact ? 'min-h-24 px-4 py-4' : 'min-h-28 px-6 py-6'}>
      <p className="text-[1.05rem] text-muted-foreground dark:text-[#9d9d9d]">
        {title}
      </p>
      {isLoading ? (
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted dark:bg-[#343434]" />
      ) : (
        <p className="mt-3 text-[2.1rem] leading-none font-semibold text-foreground dark:text-[#efefef]">
          {value ?? 0}
        </p>
      )}
    </Card>
  );
}

export default function OrgOverview({
  orgId,
  totalMembers,
  isMobile = false,
  orientation = 'grid',
}: OrgOverviewProps) {
  const [stats, setStats] = useState<OrganizationStats | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const isLoading = stats === undefined;

  useEffect(() => {
    let cancelled = false;

    const fetchStats = async (): Promise<void> => {
      setStats(undefined);
      setLoadError(null);
      try {
        const data = await getOrganizationStats(orgId);
        if (!cancelled) {
          setStats(data);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            getErrorMessage(error, 'Unable to load organization statistics.'),
          );
        }
      }
    };

    void fetchStats();
    return () => {
      cancelled = true;
    };
  }, [orgId, reloadKey]);

  if (loadError) {
    return (
      <Card className="space-y-3 p-6" role="alert">
        <p className="font-medium">Unable to load organization statistics</p>
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button
          className="w-fit"
          variant="outline"
          onClick={() => setReloadKey((key) => key + 1)}
        >
          Try again
        </Button>
      </Card>
    );
  }

  const layoutClass =
    orientation === 'stacked'
      ? 'grid grid-cols-2 gap-4 xl:grid-cols-1'
      : 'grid grid-cols-2 gap-4 lg:grid-cols-4';

  return (
    <div className={layoutClass}>
      <StatCard
        title="Links"
        value={stats?.total_links}
        isLoading={isLoading}
        compact={isMobile}
      />
      <StatCard
        title="Members"
        value={totalMembers}
        isLoading={false}
        compact={isMobile}
      />
      <StatCard
        title="Total Visits"
        value={stats?.total_visits}
        isLoading={isLoading}
        compact={isMobile}
      />
      <StatCard
        title="Unique Visits"
        value={stats?.unique_visits}
        isLoading={isLoading}
        compact={isMobile}
      />
    </div>
  );
}
