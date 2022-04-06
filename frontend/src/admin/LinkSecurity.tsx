import { BackTop, Button, Col, Row } from 'antd';
import React from 'react';
import { IoReturnUpBack } from 'react-icons/io5';

function LinkSecurity() {

  return (
    <>
      <BackTop />
      <Row className="primary-row">
        <Col span={24}>
          <Button
            type="text"
            href="/app/#/admin"
            icon={<IoReturnUpBack />}
            size="large"
          />
          {/* <span className="page-title">
            {this.state.roleText.grant_title}
          </span> */}
        </Col>
      </Row>

      <Row className="primary-row">
        <Col span={24}>
          Test
        </Col>
      </Row>

      {/* {this.state.entities === null ? (
        <Spin size="large" />
      ) : (
        this.state.entities.map((entity) => (
          <EntityRow
            key={entity.entity}
            roleText={this.state.roleText!}
            info={entity}
            onRevoke={this.onRevoke}
          />
        ))
      )} */}
    </>
  );
}

export default LinkSecurity;
