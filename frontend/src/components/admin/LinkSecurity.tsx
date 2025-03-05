/**
 * Implements the [[LinkSecurity]] component
 * @packageDocumentation
 */

import ExclamationCircleFilled from '@ant-design/icons/lib/icons/ExclamationCircleFilled';
import { Button, Col, Popconfirm, Row } from 'antd/lib';
import Spin from 'antd/es/spin';
import React, { useEffect, useState } from 'react';
import {
  PendingLink,
  PendingLinkAction,
} from '../../interfaces/google-safebrowse';
import { getPendingLinks, getStatus } from '../../api/google-safebrowse';

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
 * Wrapper function to approve or deny a pending link
 * @param action - pending link action
 * @param link_id - id of the link
 */
function LinkAction(action: PendingLinkAction, link_id: string) {
  fetch(`/api/v1/security/${action}/${link_id}`, {
    method: 'PATCH',
  });
  document.location.reload();
}

/**
 * The [[PendingLinkRow]] component displays the pending link row
 * @param props - the props for the component
 */
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

export default function LinkSecurity() {
  const [pendingLinks, setPendingLinks] = useState<Array<PendingLink> | null>(
    null,
  );

  const [securityStatus, setSecurityStatus] = useState<string>('OFF');

  useEffect(() => {
    getPendingLinks().then((links: PendingLink[]) => {
      setPendingLinks(links);
    });

    getStatus().then((status: string) => {
      setSecurityStatus(status);
    });
  }, []);

  return (
    <>
      <Row className="primary-row">
        <span>
          <strong>Current Security Status</strong>: {securityStatus}
        </span>
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
