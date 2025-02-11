/**
 * Implement the [[Ticket]] component
 * @packageDocumentation
 */

import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  Popconfirm,
  Row,
  Space,
  Typography,
} from 'antd/lib';
import base32 from 'hi-base32';
import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import TicketDetails, { EntityDetails } from '../../components/TicketDetails';
import ResolveTicketDrawer from '../../drawers/ResolveTicketDrawer';
import { EntityPositionInfo, ResolveTicketInfo, TicketInfo } from '../../types';

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
   * helpDeskText: The text fields related to the help desk
   * loading: Whether the component is loading
   * isResolveDrawerOpen: Whether the ResolveTicketModal is open
   */
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [entityPositionInfo, setEntityPositionInfo] =
    useState<EntityPositionInfo | null>(null);
  const [helpDeskText, setHelpDeskText] = useState<Record<string, any> | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [isResolveDrawerOpen, setIsResolveDrawerOpen] =
    useState<boolean>(false);

  const history = useHistory();
  const { message } = App.useApp();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const mode = queryParams.get('mode');

  /**
   * Get the entity position information
   * @method
   *
   * @param entity - The entity to get the position for
   */
  const getEntityPosition = async (entity: string) => {
    const response = await fetch(
      `/api/v1/user/${base32.encode(entity)}/position`,
    );
    const body = await response.json();
    setEntityPositionInfo(body);
  };

  /**
   * Get the ticket information
   * @method
   */
  const getTicket = async () => {
    const response = await fetch(`/api/v1/ticket/${base32.encode(ticketID)}`);
    const body = await response.json();
    if (response.ok) {
      setTicketInfo(body);

      // Get the position information of the ticket's entity
      if (userPrivileges.has('admin') && body.entity) {
        await getEntityPosition(body.entity);
      }
    }
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
        message.success('Ticket resolved successfully', 2);
        history.push('/tickets');
      } else {
        message.error('Failed to resolve ticket; unable to delete ticket', 2);
      }
    } else if (response.status === 204) {
      // If not resolving
      message.success('Ticket deleted successfully', 2);
      history.push('/tickets');
    } else {
      message.error('Failed to delete ticket');
    }
  };

  /**
   * Fetch the help desk text
   * @method
   */
  const getHelpDeskText = async () => {
    const response = await fetch('/api/v1/ticket/text');
    const body = await response.json();
    setHelpDeskText(body);
  };

  /**
   * Grant a role to an entity
   *
   * @param entity The entity to grant the role to
   * @param role The role to grant
   * @param comment The comment to add to the grant
   */
  const grantRole = async (entity: string, role: string, comment?: string) => {
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
  const resolveTicket = async (values: ResolveTicketInfo) => {
    // Grant the role if the ticket is an approved role request
    if (!ticketInfo) {
      return;
    }

    if (
      (ticketInfo.reason === 'whitelisted' ||
        ticketInfo.reason === 'power_user') &&
      ticketInfo.entity &&
      values.action === 'approved'
    ) {
      await grantRole(ticketInfo.entity, ticketInfo.reason, values.comment);
    }

    // Send the resolution email
    await sendEmail(ticketInfo, values.action, values.comment);

    // Delete the ticket
    await deleteTicket(true);
  };

  useEffect(() => {
    const initComponent = async () => {
      // Open the resolve modal if the mode is 'resolve'
      switch (mode) {
        case 'resolve':
          setIsResolveDrawerOpen(true);
          break;
        default:
          break;
      }

      // Perform fetches
      setLoading(true);
      const fetchPromises = [getHelpDeskText(), getTicket()];
      await Promise.all(fetchPromises);
      setLoading(false);
    };

    initComponent();
  }, [mode]);

  return (
    <>
      {ticketInfo &&
        helpDeskText &&
        (entityPositionInfo || !ticketInfo.entity) && (
          <ResolveTicketDrawer
            open={isResolveDrawerOpen}
            ticketInfo={ticketInfo}
            entityPositionInfo={entityPositionInfo}
            helpDeskText={helpDeskText}
            onResolve={resolveTicket}
            onClose={() => setIsResolveDrawerOpen(false)}
          />
        )}

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Row justify="space-between" align="middle">
            <Col>
              <Typography.Title>Ticket {ticketID}</Typography.Title>
            </Col>
            <Col>
              <Space>
                {userPrivileges.has('admin') && (
                  <Button
                    icon={<CheckCircleOutlined />}
                    type="primary"
                    onClick={() => setIsResolveDrawerOpen(true)}
                  >
                    Resolve
                  </Button>
                )}
                <Popconfirm
                  title="Are you sure you want to close this ticket?"
                  onConfirm={() => deleteTicket(false)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button icon={<CloseCircleOutlined />} danger>
                    Close
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
              <TicketDetails
                helpDeskText={helpDeskText}
                ticketInfo={ticketInfo}
              />
            ) : (
              <Typography.Text italic>
                Failed to load ticket details
              </Typography.Text>
            )}
          </Card>
        </Col>
        <Col span={12}>
          {userPrivileges.has('admin') && ticketInfo?.entity && (
            <Card loading={loading} title="Associated NetID Details">
              {entityPositionInfo ? (
                <EntityDetails entityPositionInfo={entityPositionInfo} />
              ) : (
                <Typography.Text>
                  Failed to load associated NetID position details
                </Typography.Text>
              )}
            </Card>
          )}
        </Col>
      </Row>
    </>
  );
};

export default Ticket;
