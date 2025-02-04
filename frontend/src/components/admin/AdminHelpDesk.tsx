import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Form,
  Input,
  Layout,
  List,
  Row,
  Space,
  Switch,
  Tooltip,
  Typography,
  message,
} from 'antd/lib';
import dayjs from 'dayjs';
import base32 from 'hi-base32';
import React, { useEffect, useState } from 'react';
import { TicketInfo, EntityPositionInfo } from '../../types';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

/**
 * Component for the ticket review
 */
const TicketReview: React.FC<{
  ticket: TicketInfo;
  onTicketDeleted: () => void;
  messageApi: any;
}> = ({ ticket, onTicketDeleted, messageApi }) => {
  /**
   * State for the [[TicketReview]] component
   *
   * loading: Whether the component is loading
   * submitting: Whether the form submission is in progress
   * entityPositionInfo: Additional information related to the entity's position in the university
   */
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [entityPositionInfo, setEntityPositionInfo] =
    useState<EntityPositionInfo>({
      titles: ['Cannot fetch titles'],
      departments: ['Cannot fetch departments'],
      employmentTypes: ['Cannot fetch employment types'],
    });

  useEffect(() => {
    const fetchEntityPositionInfo = async () => {
      if (!ticket.entity) {
        return;
      }

      setLoading(true);
      const encodedEntity = base32.encode(ticket.entity);
      if (!encodedEntity) {
        return;
      }
      const response = await fetch(`/api/v1/user/${encodedEntity}/position`);
      const body = await response.json();
      setEntityPositionInfo(body);
      setLoading(false);
    };

    fetchEntityPositionInfo();
  }, [ticket]);

  /**
   * Grant a role to an entity
   *
   * @param entity The entity to grant the role to
   * @param role The role to grant
   * @param comment The comment to add to the grant
   */
  const grantRole = async (entity: string, role: string, comment: string) => {
    const encodedEntity = base32.encode(entity);
    await fetch(`/api/v1/role/${role}/entity/${encodedEntity}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment }),
    });
  };

  /**
   * Delete the current ticket. Also update the parent component's state.
   * @method
   *
   * @returns Whether the ticket was successfully deleted
   */
  const deleteTicket = async (): Promise<boolean> => {
    const encodedId = base32.encode(ticket._id);
    const response = await fetch(`/api/v1/ticket/${encodedId}`, {
      method: 'DELETE',
    });
    return response.ok;
  };

  /**
   * Send a resolution email
   * @method
   *
   * @param resolved_ticket - The ticket that was just submitted
   * @param approved - Whether the ticket was approved
   * @param comment - The comment when the ticket was resolved
   */
  const sendEmail = async (
    resolved_ticket: TicketInfo,
    approved?: boolean,
    comment?: string,
  ) => {
    const body: any = {
      ticketID: resolved_ticket._id,
      category: 'resolution',
    };

    if (approved !== undefined) {
      body.resolution = approved ? 'APPROVED' : 'DENIED';
    }

    if (comment !== undefined && comment !== '') {
      body.comment = comment;
    }

    await fetch('/api/v1/ticket/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  /**
   * Handle form submission
   * @method
   *
   */
  const handleReviewSubmit = async (values: any) => {
    setSubmitting(true);
    // Grant the role if the ticket is an approved role request
    if (
      (ticket.reason === 'whitelisted' || ticket.reason === 'power_user') &&
      values.approve
    ) {
      await grantRole(
        ticket.reason === 'whitelisted' ? ticket.entity : ticket.reporter,
        ticket.reason,
        values.comment,
      );
    }

    // Send the resolution email
    await sendEmail(ticket, values.approve, values.comment);

    // Delete the ticket
    const isDeleted = await deleteTicket();

    if (isDeleted) {
      messageApi.success('Successfully resolved ticket', 2);
      onTicketDeleted();
    } else {
      messageApi.error('Failed to resolve ticket; unable to delete ticket', 2);
    }

    setSubmitting(false);
  };

  if (!ticket) {
    return <Text>Error fetching ticket.</Text>;
  }

  return (
    <>
      <Card title="Ticket Details" bordered>
        <Space split={<Divider type="vertical" />}>
          <Descriptions column={1}>
            <Descriptions.Item label="ID">{ticket._id}</Descriptions.Item>
            <Descriptions.Item label="Submission Date">
              {dayjs(new Date(Number(ticket.timestamp) * 1000)).format(
                'MMM D, YYYY, h:mm a',
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Reporter">
              {ticket.reporter}
            </Descriptions.Item>
            <Descriptions.Item label="Reason">
              {ticket.reason === 'power_user'
                ? 'Requesting the power user role for self'
                : ticket.reason === 'whitelisted'
                ? 'Requesting to whitelist the associate NetID'
                : 'Other'}
            </Descriptions.Item>
            {ticket.entity && (
              <Descriptions.Item label="Associated NetID">
                {ticket.entity}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Comment">
              {ticket.comment}
            </Descriptions.Item>
          </Descriptions>
          {ticket.entity && (
            <Descriptions column={1}>
              <Descriptions.Item label="Titles">
                {loading
                  ? 'Loading...'
                  : entityPositionInfo.titles
                  ? entityPositionInfo.titles.join(', ')
                  : 'No titles found'}
              </Descriptions.Item>
              <Descriptions.Item label="Departments">
                {loading
                  ? 'Loading...'
                  : entityPositionInfo.departments
                  ? entityPositionInfo.departments.join(', ')
                  : 'No departments found'}
              </Descriptions.Item>
              <Descriptions.Item label="Employment Types">
                {loading
                  ? 'Loading...'
                  : entityPositionInfo.employmentTypes
                  ? entityPositionInfo.employmentTypes.join(', ')
                  : 'No employee types found'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Space>
      </Card>
      <Divider />
      <Form onFinish={handleReviewSubmit} initialValues={{ approve: false }}>
        <Form.Item label="Comment" name="comment">
          <Input.TextArea rows={4} placeholder="Enter a comment" />
        </Form.Item>
        {(ticket.reason === 'whitelisted' ||
          ticket.reason === 'power_user') && (
          <Form.Item label="Action" name="approve" valuePropName="checked">
            <Switch
              checkedChildren="Approve"
              unCheckedChildren="Deny"
              defaultChecked={false}
            />
          </Form.Item>
        )}
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Resolve
          </Button>
        </Form.Item>
      </Form>
    </>
  );
};

/**
 * Component for the admin help desk page
 */
const AdminHelpDesk: React.FC = () => {
  /**
   * State for the [[AdminHelpDesk]] component
   *
   * isHelpDeskEnabled: Whether the help desk is enabled
   * loading: Whether the component is loading
   * tickets: The list of tickets for all users
   * selectedId: The ID of the selected ticket
   * sortOrder: The order to sort the tickets
   */
  const [isHelpDeskEnabled, setIsHelpDeskEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [messageApi, contextHolder] = message.useMessage();

  /**
   * Fetch the tickets for the currently logged in user. Also set the selected ticket.
   * @method
   */
  const fetchTickets = async () => {
    setLoading(true);
    const response = await fetch(`/api/v1/ticket?timestamp_sort=${sortOrder}`);
    const body = await response.json();
    setTickets(body);
    if (
      !selectedId ||
      !body.find((ticket: TicketInfo) => ticket._id === selectedId)
    ) {
      setSelectedId(body[0]?._id || '');
    }
    setLoading(false);
  };

  /**
   * Fetch whether the help desk is enabled
   * @method
   */
  const fetchIsHelpDeskEnabled = async () => {
    const response = await fetch('/api/v1/ticket/enabled');
    const body = await response.json();
    setIsHelpDeskEnabled(body.enabled);
  };

  useEffect(() => {
    fetchTickets();
    fetchIsHelpDeskEnabled();
  }, [sortOrder]);

  return (
    <>
      {contextHolder}
      <Title>
        Help Desk {isHelpDeskEnabled ? '' : <Text italic>(disabled)</Text>}
      </Title>
      <Layout>
        <Sider width="25%">
          <Row justify="space-between" align="middle">
            <Col>
              <Text>{tickets.length} ticket(s)</Text>
            </Col>
            <Col>
              <Tooltip
                title={`Swap to ${
                  sortOrder === 'desc' ? 'oldest' : 'newest'
                } first`}
              >
                <Button
                  onClick={() =>
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                  }
                  type="text"
                  loading={loading}
                  icon={
                    !loading &&
                    (sortOrder === 'desc' ? (
                      <ArrowUpOutlined />
                    ) : (
                      <ArrowDownOutlined />
                    ))
                  }
                  disabled={tickets.length === 0}
                />
              </Tooltip>
            </Col>
          </Row>
          <List
            itemLayout="horizontal"
            dataSource={tickets}
            renderItem={(ticket) => (
              <List.Item
                key={ticket._id}
                onClick={() => setSelectedId(ticket._id)}
                style={{
                  cursor: 'pointer',
                  backgroundColor:
                    selectedId === ticket._id ? '#e6f7ff' : 'transparent',
                }}
              >
                <List.Item.Meta
                  title={ticket._id}
                  description={dayjs(
                    new Date(Number(ticket.timestamp) * 1000),
                  ).format('MMM D, YYYY')}
                />
              </List.Item>
            )}
            locale={{ emptyText: 'No tickets' }}
            style={{
              height: '100vh',
              overflowY: 'auto',
            }}
          />
        </Sider>
        <Content style={{ paddingLeft: '1rem' }}>
          {selectedId ? (
            <TicketReview
              ticket={tickets.find((ticket) => ticket._id === selectedId)!}
              onTicketDeleted={fetchTickets}
              messageApi={messageApi}
            />
          ) : (
            <Text>Select a ticket to review.</Text>
          )}
        </Content>
      </Layout>
    </>
  );
};

export default AdminHelpDesk;
