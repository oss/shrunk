import { DeleteOutlined, EditOutlined, LinkOutlined } from '@ant-design/icons';
import { Card, Col } from 'antd/lib';
import React from 'react';
import { useHistory } from 'react-router';

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

  return (
    <Col span={8}>
      <Card
        actions={[
          <EditOutlined onClick={onEdit} key="edit" />,
          <DeleteOutlined key="delete" />,
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
