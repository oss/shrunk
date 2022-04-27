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

enum PendingLinkAction {
  Approve = 'promote',
  Deny = 'reject',
}

function LinkAction(action: PendingLinkAction, link_id: string) {
  fetch(`/api/v1/security/${action}/${link_id}`, {
    method: 'PATCH',
  });
  document.location.reload();
}

function PendingLinkRow(props: PendingRowProps) {
  const { document } = props;
  return (
    <Row className="primary-row">
      <Col span={20}>
        <Row>
          <Col span={24}>
            <span className="title">{document.title}</span>
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
          onConfirm={() => LinkAction(PendingLinkAction.Deny, document._id)}
          icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
        >
          <Button danger style={{ margin: '0px 10px' }}>
            Deny
          </Button>
        </Popconfirm>
      </Col>
      <Col span={2}>
        <Popconfirm
          placement="top"
          title="Are you sure?"
          onConfirm={() => LinkAction(PendingLinkAction.Approve, document._id)}
          icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
        >
          <Button type="primary" style={{ margin: '0px 10px' }}>
            Approve
          </Button>
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
