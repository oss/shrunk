/**
 * Implements the [[LinkSecurity]] component
 * @packageDocumentation
 */

import Spin from 'antd/es/spin';
import { Button, Col, Popconfirm, Row } from 'antd';
import { CircleAlertIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  getPendingLinks,
  getStatus,
  updateLinkSecurity,
} from '@/api/google-safebrowse';
import { PendingLink } from '@/interfaces/google-safebrowse';

interface PendingRowProps {
  document: PendingLink;
}

function PendingLinkRow(props: PendingRowProps) {
  const { document } = props;

  function updateLink(action: 'promote' | 'reject') {
    updateLinkSecurity(document._id, action);
    window.location.reload();
  }

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
          onConfirm={() => updateLink('reject')}
          icon={<CircleAlertIcon style={{ color: 'red' }} />}
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
          onConfirm={() => updateLink('promote')}
          icon={<CircleAlertIcon style={{ color: 'red' }} />}
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
