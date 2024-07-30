import {
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { Card, Col, Popconfirm, Tooltip } from 'antd/lib';
import React from 'react';
import { useHistory } from 'react-router';
import { deleteLinkHub } from '../api/LinkHub';

interface ILinkHubRow {
  linkHubTitle: string;
  linkHubId: string;
  linkHubAlias: string;
}

export default function LinkHubRow(props: ILinkHubRow) {
  const { Meta } = Card;
  const history = useHistory();

  function onEdit() {
    history.push(`/linkhubs/${props.linkHubId}/edit`);
  }

  function onDelete() {
    deleteLinkHub(props.linkHubId);
    history.go(0); // TODO: Replace with just a call to rerender the state instead of reloading the entire page.
  }

  return (
    <Col span={8}>
      <Card
        actions={[
          <EditOutlined onClick={onEdit} key="edit" />,
          <Popconfirm
            placement="top"
            title="Are you sure?"
            onConfirm={onDelete}
            icon={<ExclamationCircleFilled style={{ color: 'red' }} />}
          >
            <Tooltip title="Delete link">
              <DeleteOutlined key="delete" />
            </Tooltip>
          </Popconfirm>,
        ]}
      >
        <Meta
          title={props.linkHubTitle}
          description={`${window.location.origin}/h/${props.linkHubAlias}`}
        />
      </Card>
    </Col>
  );
}
