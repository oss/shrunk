import { Row, Col } from 'antd/lib';
import React from 'react';

interface IErrorPage {
  title: string;
  description: string;
}

export default function ErrorPage(props: IErrorPage) {
  return (
    <>
      <Row gutter={[16, 16]}>
        <Col span={24} className="tw-text-center tw-mt-12 tw-mb-2 tw-size-2/3">
          <h1 className="tw-m-0 tw-text-7xl tw-font-bold tw-tracking-tighter tw-text-balance">
            {props.title}
          </h1>
          <p className="tw-text-pretty">{props.description}</p>
        </Col>
      </Row>
    </>
  );
}
