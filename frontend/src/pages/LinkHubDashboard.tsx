import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import './Dashboard.less';
import { Button, Col, Row } from 'antd/lib';
import { PlusCircleFilled } from '@ant-design/icons/lib/icons';
import { SearchBox } from '../components/SearchBox';
import LinkHubRow from '../components/LinkHubRow';

async function searchLinkHubs(netid: string) {
  const resp = await fetch(`/api/v1/linkhub/netid/${netid}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const result = await resp.json();

  return result.results;
}

interface ILinkHubDashboard {
  netid: string;
}

export default function LinkHubDashboard(props: ILinkHubDashboard) {
  const history = useHistory();

  const [linkHubs, setLinkHubs] = useState<any[]>([]);

  useEffect(() => {
    searchLinkHubs(props.netid).then((value: any) => {
      setLinkHubs(value);
    });
  }, []);

  async function createLinkHub(): Promise<any> {
    const result = await fetch('/api/v1/linkhub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Untitled LinkHub',
      }),
    }).then((resp) => resp.json());
    history.push(`/linkhubs/${result.id}/edit`);
  }

  return (
    <>
      <Row className="dashboard-title">
        <Col>
          <span className="page-title">LinkHub Dashboard</span>
        </Col>
      </Row>
      <Row className="primary-row" gutter={[8, 24]}>
        <Col xs={{ span: 24 }} sm={{ span: 9 }}>
          <SearchBox
            placeholder="Search LinkHubs by NetID..."
            updateQueryString={(newQuery: string) => {
              searchLinkHubs(newQuery);
            }}
          />
        </Col>
        <Col className="shrink-link">
          <Button
            type="primary"
            aria-label="create linkhub"
            onClick={createLinkHub}
          >
            <PlusCircleFilled /> Create LinkHub
          </Button>
        </Col>
      </Row>
      <div>
        <Row gutter={16}>
          {linkHubs.map((value) => (
            <LinkHubRow
              linkHubTitle={value.title}
              linkHubId={value._id}
              linkHubAlias={value.alias}
            />
          ))}
        </Row>
      </div>
    </>
  );
}
