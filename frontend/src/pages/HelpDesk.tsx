/**
 * Implement the [[HelpDesk]] component
 * @packageDocumentation
 */

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FormOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Flex,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tooltip,
  Typography,
} from 'antd/lib';
import dayjs from 'dayjs';
import base32 from 'hi-base32';
import React, { useEffect, useState } from 'react';
import CreateTicketDrawer from '../drawers/CreateTicketDrawer';
import { TicketInfo } from '../types';

/**
 * Props for the [[HelpDesk]] component
 * @interface
 */
interface Props {
  /**
   * NetID of the user
   * @property
   */
  netid: string;

  /**
   * A set of the user's privileges.
   * @property
   */
  userPrivileges: Set<string>;
}

/**
 * Component for the help desk page. This includes both the user and admin views.
 */
const HelpDesk: React.FC<Props> = ({ netid, userPrivileges }) => {
  /**
   * State for the [[TicketTable]] component
   *
   * loading: Whether the component is loading
   * helpDeskText: The text fields related to the help desk
   * isHelpDeskEnabled: Whether the help desk is enabled
   * tickets: The list of tickets
   * isCreateDrawerOpen: Whether the CreateTicketDrawer is open
   */
  const [loading, setLoading] = useState<boolean>(false);
  const [helpDeskText, setHelpDeskText] = useState<Record<string, any> | null>(
    null,
  );
  const [isHelpDeskEnabled, setIsHelpDeskEnabled] = useState<boolean>(false);
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState<boolean>(false);

  const { message } = App.useApp();

  /**
   * Get whether the help desk is enabled
   * @method
   */
  const getIsHelpDeskEnabled = async () => {
    const response = await fetch('/api/v1/ticket/enabled');
    const body = await response.json();
    setIsHelpDeskEnabled(body.enabled);
  };

  /**
   * Get text fields related to the help desk
   * @method
   */
  const getHelpDeskText = async () => {
    const response = await fetch('/api/v1/ticket/text');
    const body = await response.json();
    setHelpDeskText(body);
  };

  /**
   * Get the tickets. This is the user's open tickets for the user and all open tickets for admins.
   * By default, the tickets are sorted by timestamp in descending order.
   * @method
   */
  const getTickets = async () => {
    let response = null;
    if (userPrivileges.has('admin')) {
      response = await fetch(
        `/api/v1/ticket?filter=status:open&sort=-timestamp`,
      );
    } else {
      response = await fetch(
        `/api/v1/ticket?filter=reporter:${netid},status:open&sort=-timestamp`,
      );
    }
    const body = await response.json();
    setTickets(body);
  };

  /**
   * Close a ticket with the given ID
   * @method
   *
   * @param ticketID - The ID of the ticket to delete
   */
  const closeTicket = async (ticketID: string) => {
    const response = await fetch(`/api/v1/ticket/${base32.encode(ticketID)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'close',
        actioned_by: netid,
      }),
    });

    if (response.ok) {
      setTickets(tickets.filter((ticket) => ticket._id !== ticketID));
      message.success('Ticket closed successfully', 2);
    } else {
      message.error('Failed to close ticket', 2);
    }
  };

  useEffect(() => {
    const initComponent = async () => {
      setLoading(true);
      const fetchPromises = [getHelpDeskText(), getTickets()];

      if (userPrivileges.has('admin')) {
        fetchPromises.push(getIsHelpDeskEnabled());
      }

      await Promise.all(fetchPromises);
      setLoading(false);
    };

    initComponent();
  }, []);

  /**
   * Render the entity column in the table
   * @method
   *
   * @param entity - The entity to render
   */
  const renderEntity = (entity: string) => {
    if (!entity) {
      return <Typography.Text italic>N/A</Typography.Text>;
    }
    if (entity === netid) {
      return (
        <Typography.Text>
          {netid} <Typography.Text italic>(self)</Typography.Text>
        </Typography.Text>
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
    <Flex justify="flex-end">
      <Space>
        <Tooltip title="View">
          <Button
            type="text"
            icon={<EyeOutlined />}
            href={`/app/#/tickets/${record._id}`}
          />
        </Tooltip>
        {userPrivileges.has('admin') && (
          <Tooltip title="Resolve">
            <Button
              type="text"
              icon={<CheckCircleOutlined />}
              href={`/app/#/tickets/${record._id}?mode=resolve`}
            />
          </Tooltip>
        )}
        <Tooltip title="Close">
          <Popconfirm
            title="Are you sure you want to close this ticket?"
            onConfirm={() => closeTicket(record._id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<CloseCircleOutlined />} />
          </Popconfirm>
        </Tooltip>
      </Space>
    </Flex>
  );

  const userColumns = [
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) =>
        helpDeskText
          ? helpDeskText.reason[reason].name
          : 'Failed to load reason',
      width: '15%',
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
      dataIndex: 'user_comment',
      key: 'user_comment',
      ellipsis: true,
      width: '40%',
    },
    {
      title: 'Time Created',
      dataIndex: 'created_time',
      key: 'created_time',
      render: (created_time: number) =>
        dayjs(new Date(created_time * 1000)).format('MMM D, YYYY, h:mm a'),
      width: '25%',
    },
    {
      title: <Flex justify="flex-end">Actions</Flex>,
      key: 'actions',
      render: (record: TicketInfo) => renderActions(record),
      width: '15%',
    },
  ];

  const adminColumns = [
    {
      title: 'Time Created',
      dataIndex: 'created_time',
      key: 'created_time',
      render: (created_time: number) =>
        dayjs(new Date(created_time * 1000)).format('MMM D, YYYY, h:mm a'),
      width: '25%',
    },
    {
      title: 'Reporter',
      dataIndex: 'reporter',
      key: 'reporter',
      width: '20%',
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason: string) =>
        helpDeskText
          ? helpDeskText.reason[reason].name
          : 'Failed to load reason',
      width: '20%',
    },
    {
      title: 'Associated NetID',
      dataIndex: 'entity',
      key: 'entity',
      render: (entity: string) => renderEntity(entity),
      width: '20%',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: TicketInfo) => renderActions(record),
      width: '15%',
    },
  ];

  const columns = userPrivileges.has('admin') ? adminColumns : userColumns;

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Row justify="space-between" align="middle">
            <Col>
              <Typography.Title>Help Desk</Typography.Title>
            </Col>
            {!userPrivileges.has('admin') && (
              <Col>
                <Button
                  type="primary"
                  icon={<FormOutlined />}
                  onClick={() => setIsCreateDrawerOpen(true)}
                >
                  New Ticket
                </Button>
              </Col>
            )}
          </Row>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        {userPrivileges.has('admin') && (
          <Col span={24}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card loading={loading}>
                  <Statistic
                    title="Status"
                    value={isHelpDeskEnabled ? 'Enabled' : 'Disabled'}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card loading={loading}>
                  <Statistic title="Ticket Count" value={tickets.length} />
                </Card>
              </Col>
            </Row>
          </Col>
        )}
        <Col span={24}>
          <Table
            dataSource={tickets}
            columns={columns}
            rowKey="_id"
            pagination={userPrivileges.has('admin') ? { pageSize: 10 } : false}
            locale={{ emptyText: 'No pending tickets' }}
            loading={loading}
          />
        </Col>
      </Row>

      {helpDeskText && (
        <CreateTicketDrawer
          open={isCreateDrawerOpen}
          onClose={() => setIsCreateDrawerOpen(false)}
          helpDeskText={helpDeskText}
          setTickets={setTickets}
        />
      )}
    </>
  );
};

export default HelpDesk;
