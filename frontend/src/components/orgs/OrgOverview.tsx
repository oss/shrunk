import React, { useEffect, useState } from 'react';
import { Flex, Card, Statistic } from 'antd';
import { getOrganizationStats } from '../../api/organization';
import { OrganizationStats } from '../../interfaces/organizations';

interface OrgOverviewProps {
  orgId: string;
  totalMembers: number;
}

export default function OrgOverview({ orgId, totalMembers }: OrgOverviewProps) {
  const [stats, setStats] = useState<OrganizationStats | undefined>(undefined);

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getOrganizationStats(orgId);
      setStats(data);
    };
    fetchStats();
  }, []);

  if (stats === undefined) {
    return <div />;
  }
  return (
    <Flex gap={16} vertical>
      <Card style={{ flex: 0.5 }}>
        <Statistic title="Total Links" value={stats.total_links} />
      </Card>
      <Card style={{ flex: 0.5 }}>
        <Statistic title="Total Members" value={totalMembers} />
      </Card>
      <Card style={{ flex: 0.5 }}>
        <Statistic title="Total Visits" value={stats.total_visits} />
      </Card>
      <Card style={{ flex: 0.5 }}>
        <Statistic title="Unique Visits" value={stats.unique_visits} />
      </Card>
    </Flex>
  );
}
