import { useQuery } from '@tanstack/react-query';

import { getOrganizationStats } from '@/Features/Organizations/Api';
import { Alert, AlertDescription } from '@/Shared/ui/alert';
import { Button } from '@/Shared/ui/button';
import { Card } from '@/Shared/ui/card';

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
      <p className="text-[1.05rem] text-muted-foreground">{title}</p>
      {isLoading ? (
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" />
      ) : (
        <p className="mt-3 text-[2.1rem] leading-none font-semibold text-foreground">
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
  const statsQuery = useQuery({
    queryKey: ['organization-stats', orgId],
    queryFn: () => getOrganizationStats(orgId),
  });
  const isLoading = statsQuery.isPending;

  if (statsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Unable to load organization statistics.
        </AlertDescription>
        <Button
          className="mt-3"
          variant="outline"
          disabled={statsQuery.isFetching}
          onClick={() => void statsQuery.refetch()}
        >
          Retry
        </Button>
      </Alert>
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
        value={statsQuery.data?.total_links}
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
        value={statsQuery.data?.total_visits}
        isLoading={isLoading}
        compact={isMobile}
      />
      <StatCard
        title="Unique Visits"
        value={statsQuery.data?.unique_visits}
        isLoading={isLoading}
        compact={isMobile}
      />
    </div>
  );
}
