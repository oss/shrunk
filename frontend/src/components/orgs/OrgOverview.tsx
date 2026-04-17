import React, { useEffect, useState } from 'react';
import { Flex, Card, Statistic, Row, Col } from 'antd';
import { getOrganizationStats } from '@/api/organization';
import { OrganizationStats } from '@/interfaces/organizations';

interface OrgOverviewProps {
  orgId: string;
  totalMembers: number;
  isMobile?: boolean;
}

export default function OrgOverview({
  orgId,
  totalMembers,
  isMobile = false,
}: OrgOverviewProps) {
  const [stats, setStats] = useState<OrganizationStats | undefined>(undefined);
  const isLoading = stats === undefined;

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getOrganizationStats(orgId);
      setStats(data);
    };
    fetchStats();
  }, []);

  return (
    <Flex gap="1rem" wrap="wrap" justify="space-between" vertical>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={12} lg={24}>
          <Card size={isMobile ? 'small' : 'default'} loading={isLoading}>
            <Statistic title="Links" value={stats?.total_links} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={24}>
          <Card size={isMobile ? 'small' : 'default'} loading={isLoading}>
            <Statistic title="Members" value={totalMembers} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={24}>
          <Card size={isMobile ? 'small' : 'default'} loading={isLoading}>
            <Statistic title="Total Visits" value={stats?.total_visits} />
          </Card>
        </Col>
        <Col xs={12} sm={12} lg={24}>
          <Card size={isMobile ? 'small' : 'default'} loading={isLoading}>
            <Statistic title="Unique Visits" value={stats?.unique_visits} />
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}
