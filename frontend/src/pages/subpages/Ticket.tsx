import { DeleteOutlined, IssuesCloseOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Descriptions,
  Popconfirm,
  Row,
  Space,
  Typography,
} from 'antd/lib';
import dayjs from 'dayjs';
import base32 from 'hi-base32';
import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import ResolveTicketModal from '../../modals/ResolveTicketModal';
import { EntityPositionInfo, TicketInfo } from '../../types';

const { Title, Text } = Typography;

/**
 * Props for the [[Ticket]] component
 * @interface
 */
interface Props {
  /**
   * The ticket ID
   * @property
   */
  ticketID: string;

  /**
   * A set of the user's privileges.
   * @property
   */
  userPrivileges: Set<string>;
}

/**
 * Component for the ticket page
 */
const Ticket: React.FC<Props> = ({ ticketID, userPrivileges }) => {
  /**
   * State for the [[Ticket]] component
   *
   * ticketInfo: The ticket information
   * entityPositionInfo: The entity position information
   * helpDeskText: The help desk text
   * loading: Whether the component is loading
   * isResolveModalVisible: Whether the resolve modal is visible
   */
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [entityPositionInfo, setEntityPositionInfo] =
    useState<EntityPositionInfo | null>(null);
  const [helpDeskText, setHelpDeskText] = useState<any>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isResolveModalVisible, setIsResolveModalVisible] =
    useState<boolean>(false);

  const history = useHistory();
  const { message } = App.useApp();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const mode = queryParams.get('mode');

  /**
   * Fetch the ticket information
   * @method
   */
  const fetchTicket = async () => {
    setLoading(true);
    const response = await fetch(`/api/v1/ticket/${base32.encode(ticketID)}`);
    const body = await response.json();
    if (response.ok) {
      setTicketInfo(body);
    }
    setLoading(false);
  };

  /**
   * Delete the ticket
   * @method
   *
   * @param isResolving - Whether the ticket is being resolved
   */
  const deleteTicket = async (isResolving: boolean) => {
    const response = await fetch(`/api/v1/ticket/${base32.encode(ticketID)}`, {
      method: 'DELETE',
    });

    if (isResolving) {
      if (response.status === 204) {
        message.success('Successfully resolved ticket', 2);
        history.push('/admin/tickets');
      } else {
        message.error('Failed to resolve ticket; unable to delete ticket', 2);
      }
    } else if (response.status === 204) {
      // If not resolving
      message.success('Successfully deleted ticket', 2);
      if (userPrivileges.has('admin')) {
        history.push('/admin/tickets');
      } else {
        history.push('/tickets');
      }
    } else {
      message.error('Failed to delete ticket');
    }
  };

  /**
   * Fetch the entity position information
   * @method
   */
  const fetchEntityPositionInfo = async () => {
    // Should already be caught in useEffect
    if (!ticketInfo?.entity) {
      return;
    }

    setLoading(true);
    const response = await fetch(
      `/api/v1/user/${base32.encode(ticketInfo.entity)}/position`,
    );
    const body = await response.json();
    setEntityPositionInfo(body);
    setLoading(false);
  };

  /**
   * Fetch the help desk text
   * @method
   */
  const fetchHelpDeskText = async () => {
    setLoading(true);
    const response = await fetch('/api/v1/ticket/text');
    const body = await response.json();
    setHelpDeskText(body);
    setLoading(false);
  };

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
   * Send a resolution email
   * @method
   *
   * @param resolved_ticket - The ticket that was just submitted
   * @param action - Whether the ticket was approved or denied
   * @param comment - The comment when the ticket was resolved
   */
  const sendEmail = async (
    resolved_ticket: TicketInfo,
    action?: string,
    comment?: string,
  ) => {
    const body: any = {
      ticketID: resolved_ticket._id,
      category: 'resolution',
    };

    if (action !== undefined) {
      body.resolution = action.toUpperCase();
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
   * Handle resolving the ticket. This includes granting the role, deleting the ticket, and sending an email.
   * @method
   *
   * @param values - The values from the form
   */
  const resolveTicket = async (values: any) => {
    // Grant the role if the ticket is an approved role request
    if (!ticketInfo) {
      return;
    }

    if (
      (ticketInfo.reason === 'whitelisted' ||
        ticketInfo.reason === 'power_user') &&
      ticketInfo.entity &&
      values.action === 'approve'
    ) {
      await grantRole(ticketInfo.entity, ticketInfo.reason, values.comment);
    }

    // Send the resolution email
    await sendEmail(ticketInfo, values.action, values.comment);

    // Delete the ticket
    await deleteTicket(true);
  };

  useEffect(() => {
    switch (mode) {
      case 'resolve':
        setIsResolveModalVisible(true);
        break;
      default:
        break;
    }
    const fetchData = async () => {
      await fetchTicket();
      if (userPrivileges.has('admin') && ticketInfo?.entity) {
        await fetchEntityPositionInfo();
      }
      await fetchHelpDeskText();
    };

    fetchData();
  }, [ticketInfo?.entity, mode]);

  return (
    <>
      {isResolveModalVisible &&
        ticketInfo &&
        (entityPositionInfo || !ticketInfo.entity) &&
        helpDeskText && (
          <ResolveTicketModal
            visible={isResolveModalVisible}
            ticketInfo={ticketInfo}
            entityPositionInfo={entityPositionInfo}
            helpDeskText={helpDeskText}
            onResolve={resolveTicket}
            onCancel={() => setIsResolveModalVisible(false)}
          />
        )}

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title>Ticket {ticketID}</Title>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<IssuesCloseOutlined />}
                  type="primary"
                  onClick={() => setIsResolveModalVisible(true)}
                >
                  Resolve
                </Button>
                <Popconfirm
                  title="Are you sure you want to delete this ticket?"
                  onConfirm={() => deleteTicket(false)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button icon={<DeleteOutlined />} danger>
                    Delete
                  </Button>
                </Popconfirm>
              </Space>
            </Col>
          </Row>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={userPrivileges.has('admin') && ticketInfo?.entity ? 12 : 24}>
          <Card loading={loading} title="Ticket Details">
            {ticketInfo && helpDeskText ? (
              <Descriptions column={1}>
                <Descriptions.Item label="ID">
                  <Text>{ticketInfo._id}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Reporter">
                  <Text>{ticketInfo.reporter}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Reason">
                  <Text>{helpDeskText.reason[ticketInfo.reason].name}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Associated NetID">
                  <Text italic={!ticketInfo.entity}>
                    {ticketInfo.entity || 'N/A'}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Submission Date">
                  <Text>
                    {dayjs(
                      new Date(Number(ticketInfo.timestamp) * 1000),
                    ).format('MMM D, YYYY, h:mm a')}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Comment">
                  <Text>{ticketInfo.comment}</Text>
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Text italic>Unable to retrieve ticket details</Text>
            )}
          </Card>
        </Col>
        <Col span={12}>
          {userPrivileges.has('admin') && ticketInfo?.entity && (
            <Card loading={loading} title="Entity Position Details">
              {entityPositionInfo ? (
                <Descriptions column={1}>
                  <Descriptions.Item label="Titles">
                    <Text italic={!entityPositionInfo.titles}>
                      {entityPositionInfo.titles?.join(', ') ||
                        'No titles found'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Departments">
                    <Text italic={!entityPositionInfo.departments}>
                      {entityPositionInfo.departments?.join(', ') ||
                        'No departments found'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Employments Types">
                    <Text italic={!entityPositionInfo.employmentTypes}>
                      {entityPositionInfo.employmentTypes?.join(', ') ||
                        'No employment types found'}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Text>Unable to retrieve entity position details</Text>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </>
  );
};

export default Ticket;
