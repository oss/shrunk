import React from 'react';
import './Dashboard.less';
import { Button, Col, Row } from 'antd/lib';
import { SearchBox } from '../components/SearchBox';
import { OrgsSelect } from '../components/OrgsSelect';
import { PlusCircleFilled } from '@ant-design/icons/lib/icons';

export default function LinkHubDashboard() {
  return (
    <>
      <Row className="dashboard-title">
        <Col>
          <span className="page-title">LinkHub Dashboard</span>
        </Col>
      </Row>
      <Row className="primary-row" gutter={[8, 24]}>
        <Col xs={{ span: 24 }} sm={{ span: 9 }}>
          <SearchBox placeholder='Search LinkHubs...' updateQueryString={() => {}} />
        </Col>
        <Col className="shrink-link">
          <Button type="primary" aria-label="create linkhub">
            <PlusCircleFilled /> Create LinkHub
          </Button>
        </Col>
      </Row>
      <div className='dashboard-links'>

      </div>
    </>
  );
}
