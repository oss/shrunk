import React, { useEffect, useState } from 'react';
import { Flex, Card } from 'antd';
import { getOrganizationStats } from '@/src/api/organization';
import { OrganizationStats } from '@/src/interfaces/organizations';
import { Statistic } from 'antd/lib';

interface OrgOverviewProps {
  orgId: string;
  totalMembers: number;
}

export const OrgOverview = ({ orgId, totalMembers }: OrgOverviewProps) => {
  const [stats, setStats] = useState<OrganizationStats | undefined>(undefined);

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getOrganizationStats(orgId);
      setStats(data);
    };
    fetchStats();
  }, []);

  if (stats === undefined) {
    return <div></div>;
  }
  console.log(stats);
  return (<Flex gap={16} vertical>
    <Card style={{flex: 0.5}}>
        <Statistic title="Total Links" value={stats.total_links} />
    </Card>
    <Card style={{flex: 0.5}}>
        <Statistic title="Total Members" value={totalMembers} />
    </Card>
    <Card style={{flex: 0.5}}>
        <Statistic title="Total Visits" value={stats.total_visits} />
    </Card>
    <Card style={{flex: 0.5}}>
        <Statistic title="Unique Visits" value={stats.unique_visits} />
    </Card>


  </Flex>);
        
};
