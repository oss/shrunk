import React from 'react';
import { useHistory } from 'react-router-dom';
import './Dashboard.less';
import { Button, Col, Row } from 'antd/lib';
import { SearchBox } from '../components/SearchBox';
import { PlusCircleFilled } from '@ant-design/icons/lib/icons';

export default function LinkHubDashboard() {
  const history = useHistory();

  async function createLinkHub(): Promise<any> {
    const result = await fetch('/api/v1/linkhub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New LinkHub',
      }),
    }).then((resp) => resp.json());
    history.push(`/linkhubs/${result.alias}/edit`);
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
            placeholder="Search LinkHubs..."
            updateQueryString={() => {}}
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
      <div className="dashboard-links"></div>
    </>
  );
}
