import ExclamationCircleFilled from '@ant-design/icons/lib/icons/ExclamationCircleFilled';
import { BackTop, Button, Col, Popconfirm, Row } from 'antd';
import Spin from 'antd/es/spin';
import React, { useEffect, useState } from 'react';
import { IoReturnUpBack } from 'react-icons/io5';

/**
 * PendingLinkRow information fetched form backend
 * @interface
 */
interface PendingLink {
  /**
   * Id of pending link
   * @property
   */
  _id: string;

  /**
   * Name of pending link
   * @property
   */
  title: string;

  /**
   * Long url of pending link
   * @property
   */
  long_url: string;

  /**
   * netid of the creator
   * @property
   */
  netid: string;
}

/**
 * Specifies the props for each pending link
 * @interface
 */
interface PendingRowProps {
  /**
   * Takes in the link row object.
   * @property
   */
  document: PendingLink;
}


/**
 * TODO:
 *
 * NOT MPV BUT.... add the type of attack.
 */
function PendingLinkRow(props: PendingRowProps) {
  const { document } = props;
  return (
    <Row className="primary-row">
      <Col span={20}>
        <Row>
          <Col span={24}>
            <span className='title'>{document.title}</span>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <span>netID of creator: {document.netid}</span>
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <span>
              long url: <a href={document.long_url}>{document.long_url}</a>
            </span>
          </Col>
        </Row>
      </Col>
      <Col span={2}>
        <Popconfirm
          placement="top"
          title="Are you sure?"
          onConfirm={() => {}}
          icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
        >
          <Button danger>Deny</Button>
        </Popconfirm>
      </Col>
      <Col span={2}>
        <Popconfirm
          placement="top"
          title="Are you sure?"
          onConfirm={() => {}}
          icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
        >
          <Button type='primary'>Approve</Button>
        </Popconfirm>
      </Col>
    </Row>
  );
}

function LinkSecurity() {
  const [pendingLinks, setPendingLinks] =
    useState<Array<PendingLink> | null>(null);

  useEffect(() => {
    fetch('/api/v1/security/pending_links')
      .then((resp) => resp.json())
      .then((data) => {
        setPendingLinks(data.pendingLinks);
      });
  }, []);

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
        </Col>
      </Row>

      {pendingLinks == null ? (
        <Spin size="large" />
      ) : (
        pendingLinks.map((link) => (
          <PendingLinkRow key={link._id} document={link} />
        ))
      )}
    </>
  );
}

export default LinkSecurity;
