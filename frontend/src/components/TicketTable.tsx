import {
  Button,
  Col,
  message,
  Popconfirm,
  Row,
  Table,
  Typography,
} from 'antd/lib';
import dayjs from 'dayjs';
import base32 from 'hi-base32';
import React, { useEffect, useState } from 'react';

const { Title, Text } = Typography;

/**
 * Attributes for the ticket table. Not all attributes are displayed in the table
 * @interface
 */
export interface Ticket {
  /**
   * The ID of the ticket
   * @property
   */
  _id: string;

  /**
   * The NetID of the reporter
   * @property
   */
  reporter: string;

  /**
   * The reason for the ticket
   * @property
   */
  reason: string;

  /**
   * The entity the ticket is about (same as the reporter if reason is "power_user", empty if reason is "other")
   * @property
   */
  entity: string;

  /**
   * The comment on the ticket
   * @property
   */
  comment: string;

  /**
   * When the ticket was created
   * @property
   */
  timestamp: Date;
}

/**
 * Component for the table of tickets
 */
const TicketTable: React.FC = () => {
  /**
   * State for the [[TicketTable]] component
   *
   * loading: Whether the component is loading
   * messageApi: The message API for the component
   * tickets: The list of tickets from the currently logged in user
   * selectedIds: The IDs of the selected tickets
   */
  const [loading, setLoading] = useState<boolean>(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  /**
   * Fetch the tickets for the currently logged in user
   * @method
   */
  const fetchTickets = async () => {
    setLoading(true);
    const response = await fetch(`/api/v1/ticket`);
    const body = await response.json();
    setTickets(body);
    setLoading(false);
  };

  /**
   * Delete the currently selected tickets
   * @method
   */
  const deleteTickets = async () => {
    const deletePromises = selectedIds.map((ticketId) =>
      fetch(`/api/v1/ticket/${base32.encode(ticketId)}`, {
        method: 'DELETE',
      }),
    );

    const responses = await Promise.all(deletePromises);
    const allSuccessful = responses.every(
      (response) => response.status === 204,
    );

    if (allSuccessful) {
      fetchTickets();
      setSelectedIds([]);
      messageApi.success('Successfully deleted ticket(s)', 2);
    } else {
      messageApi.error('Failed to delete some ticket(s)', 2);
    }
  };

  // Selection configuration for the table. Used to select multiple tickets to delete
  const ticketSelection = {
    selectedRowKeys: selectedIds,
    onChange: (selectedRowKeys: React.Key[]) =>
      setSelectedIds(selectedRowKeys as string[]),
  };

  /**
   * Render the reason column in the table
   * @method
   */
  const renderReason = (reason: string) => {
    switch (reason) {
      case 'power_user':
        return 'Grant me the power user role';
      case 'whitelisted':
        return 'Whitelist another person to Go services';
      case 'other':
        return 'Other';
      default:
        return 'Failed to load reason';
    }
  };

  /**
   * Render the timestamp column in the table
   * @method
   */
  const renderTimestamp = (timestamp: Date) =>
    dayjs(new Date(Number(timestamp) * 1000)).format('MMM D, YYYY, h:mm a');

  /**
   * Render the entity column in the table
   * @method
   */
  const renderEntity = (entity: string) => {
    if (!entity) {
      return <Text italic>N/A</Text>;
    }
    return entity;
  };

  // Fetch the tickets for the currently logged in user
  useEffect(() => {
    fetchTickets();
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: '_id',
      key: '_id',
      width: '10%',
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) => renderReason(reason),
      width: '20%',
    },
    {
      title: 'Associated NetID',
      dataIndex: 'entity',
      key: 'entity',
      render: (entity: string) => renderEntity(entity),
      width: '15%',
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      width: '40%',
    },
    {
      title: 'Submission Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: Date) => renderTimestamp(timestamp),
      width: '15%',
    },
  ];

  return (
    <>
      {contextHolder}
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={2}>My Tickets</Title>
            </Col>
            <Col>
              <Popconfirm
                title="Are you sure?"
                onConfirm={deleteTickets}
                okText="Yes"
                cancelText="No"
              >
                <Button type="primary" disabled={!selectedIds.length}>
                  {selectedIds.length > 0
                    ? `Delete (${selectedIds.length})`
                    : 'Delete'}
                </Button>
              </Popconfirm>
            </Col>
          </Row>
        </Col>
      </Row>
      <Table
        dataSource={tickets}
        columns={columns}
        rowKey="_id"
        rowSelection={ticketSelection}
        pagination={false}
        locale={{ emptyText: 'No pending tickets' }}
        loading={loading}
      />
    </>
  );
};

export default TicketTable;
