import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import {
  Button,
  Popconfirm,
  Space,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd/lib';
import dayjs from 'dayjs';
import base32 from 'hi-base32';
import React, { useEffect, useState } from 'react';
import { TicketInfo } from '../types';

const { Text } = Typography;
const { useMessage } = message;

/**
 * Props for the [[TicketTable]] component
 * @interface
 */
interface Props {
  /**
   * The NetID of the currently logged in user
   * @property
   */
  netid: string;

  /**
   * Help desk text
   * @property
   */
  helpDeskText: Record<string, any>;
}

/**
 * Component for the table of tickets
 */
const TicketTable: React.FC<Props> = ({ netid, helpDeskText }) => {
  /**
   * State for the [[TicketTable]] component
   *
   * loading: Whether the component is loading
   * tickets: The list of tickets from the currently logged in user
   */
  const [loading, setLoading] = useState<boolean>(false);
  const [tickets, setTickets] = useState<TicketInfo[]>([]);

  const [messageApi, contextHolder] = useMessage();

  /**
   * Fetch the tickets for the currently logged in user
   * @method
   */
  const fetchTickets = async () => {
    setLoading(true);
    const response = await fetch(`/api/v1/ticket?sort=-timestamp`);
    const body = await response.json();
    setTickets(body);
    setLoading(false);
  };

  /**
   * Delete the ticket with the given ID
   * @method
   *
   * @param ticketID - The ID of the ticket to delete
   */
  const deleteTicket = async (ticketID: string) => {
    const response = await fetch(`/api/v1/ticket/${base32.encode(ticketID)}`, {
      method: 'DELETE',
    });

    if (response.status === 204) {
      fetchTickets();
      messageApi.success('Successfully deleted ticket', 2);
    } else {
      messageApi.error('Failed to delete ticket', 2);
    }
  };

  /**
   * Render the entity column in the table
   * @method
   *
   * @param entity - The entity to render
   */
  const renderEntity = (entity: string) => {
    if (!entity) {
      return <Text italic>N/A</Text>;
    }
    if (entity === netid) {
      return (
        <Text>
          {netid} <Text italic>(self)</Text>
        </Text>
      );
    }
    return entity;
  };

  /**
   * Render the actions column in the table
   * @method
   *
   * @param record - The ticket record
   */
  const renderActions = (record: TicketInfo) => (
    <Space>
      <Tooltip title="View">
        <Button
          type="text"
          icon={<EyeOutlined />}
          href={`/app/#/tickets/${record._id}`}
        />
      </Tooltip>
      <Tooltip title="Delete">
        <Popconfirm
          title="Are you sure you want to delete this ticket?"
          onConfirm={() => deleteTicket(record._id)}
          okText="Yes"
          cancelText="No"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Tooltip>
    </Space>
  );

  // Fetch the tickets for the currently logged in user
  useEffect(() => {
    fetchTickets();
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: '_id',
      key: '_id',
      width: '20%',
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) =>
        helpDeskText.reason[reason].name || 'Failed to load reason',
      width: '25%',
    },
    {
      title: 'Associated NetID',
      dataIndex: 'entity',
      key: 'entity',
      render: (entity: string) => renderEntity(entity),
      width: '15%',
    },
    {
      title: 'Submission Date',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: Date) =>
        dayjs(new Date(Number(timestamp) * 1000)).format('MMM D, YYYY, h:mm a'),
      width: '20%',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: TicketInfo) => renderActions(record),
      width: '20%',
    },
  ];

  return (
    <>
      {contextHolder}
      <Table
        dataSource={tickets}
        columns={columns}
        rowKey="_id"
        pagination={false}
        locale={{ emptyText: 'No pending tickets' }}
        loading={loading}
      />
    </>
  );
};

export default TicketTable;
