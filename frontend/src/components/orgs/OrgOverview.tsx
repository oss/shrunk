import { useEffect, useState } from 'react';

import { getOrganizationStats } from '@/api/organization';
import { OrganizationStats } from '@/interfaces/organizations';
import { adminSurfaceClass } from '@/lib/admin-styles';

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
    <div
      className={`${adminSurfaceClass} ${compact ? 'min-h-24 px-4 py-4' : 'min-h-28 px-6 py-6'}`}
    >
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
    </div>
  );
}

export default function OrgOverview({
  orgId,
  totalMembers,
  isMobile = false,
  orientation = 'grid',
}: OrgOverviewProps) {
  const [stats, setStats] = useState<OrganizationStats | undefined>(undefined);
  const isLoading = stats === undefined;

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getOrganizationStats(orgId);
      setStats(data);
    };
    fetchStats();
  }, [orgId]);

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
