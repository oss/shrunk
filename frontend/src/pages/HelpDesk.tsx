/**
 * Implement the [[HelpDesk]] component
 * @packageDocumentation
 */
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
import {
  CircleCheckIcon,
  CirclePlusIcon,
  CircleXIcon,
  EyeIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { ColumnsType } from 'antd/es/table';
import {
  closeTicket,
  getHelpDeskText,
  getTickets,
  getTicketsResolvedCount,
} from '../api/tickets';
import CreateTicketDrawer from '../drawers/CreateTicketDrawer';
import { TicketInfo } from '../interfaces/tickets';

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
   * numTicketsResolved: The number of tickets resolved
   * isCreateDrawerOpen: Whether the CreateTicketDrawer is open
   */
  const [loading, setLoading] = useState<boolean>(false);
  const [helpDeskText, setHelpDeskText] = useState<Record<string, any> | null>(
    null,
  );
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [numTicketsResolved, setNumTicketsResolved] = useState<number>(0);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState<boolean>(false);

  const { message } = App.useApp();

  /**
   * Get text fields related to the help desk
   * @method
   */
  const onGetHelpDeskText = async () => {
    const data = await getHelpDeskText();
    setHelpDeskText(data);
  };

  /**
   * Get the number of tickets resolved
   * @method
   */
  const getNumTicketsResolved = async () => {
    setNumTicketsResolved(await getTicketsResolvedCount());
  };

  /**
   * Get the tickets. This is the user's open tickets for the user and all open tickets for admins.
   * By default, the tickets are sorted by timestamp in descending order.
   * @method
   */
  const onGetTickets = async () => {
    setTickets(await getTickets(userPrivileges, netid));
  };

  /**
   * Close a ticket with the given ID
   * @method
   *
   * @param ticketID - The ID of the ticket to delete
   */
  const onCloseTicket = async (ticketID: string) => {
    const response = await closeTicket(ticketID);

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
      const fetchPromises = [onGetHelpDeskText(), onGetTickets()];

      if (userPrivileges.has('admin')) {
        fetchPromises.push(getNumTicketsResolved());
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
            icon={<EyeIcon />}
            href={`/app/tickets/${record._id}`}
          />
        </Tooltip>
        {userPrivileges.has('admin') && (
          <Tooltip title="Resolve">
            <Button
              type="text"
              icon={<CircleCheckIcon />}
              href={`/app/tickets/${record._id}?mode=resolve`}
            />
          </Tooltip>
        )}
        <Tooltip title="Close">
          <Popconfirm
            title="Are you sure you want to close this ticket?"
            onConfirm={() => onCloseTicket(record._id)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<CircleXIcon />} />
          </Popconfirm>
        </Tooltip>
      </Space>
    </Flex>
  );

  const userColumns: ColumnsType<TicketInfo> = [
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
      fixed: 'right',
      render: (record: TicketInfo) => renderActions(record),
      width: '15%',
    },
  ];

  const adminColumns: ColumnsType<TicketInfo> = [
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
      title: <Flex justify="flex-end">Actions</Flex>,
      key: 'actions',
      fixed: 'right',
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
                  icon={<CirclePlusIcon />}
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
                  <Statistic title="Open Tickets" value={tickets.length} />
                </Card>
              </Col>
              <Col span={12}>
                <Card loading={loading}>
                  <Statistic
                    title="Tickets Resolved"
                    value={numTicketsResolved}
                  />
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
            locale={{ emptyText: 'No open tickets' }}
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
