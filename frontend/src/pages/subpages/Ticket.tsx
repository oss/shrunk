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
import { EntityPositionInfo, TicketInfo } from '../../types';

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
   * closing: Whether the ticket is closing
   * isResolveDrawerOpen: Whether the ResolveTicketModal is open
   */
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [entityPositionInfo, setEntityPositionInfo] =
    useState<EntityPositionInfo | null>(null);
  const [helpDeskText, setHelpDeskText] = useState<Record<string, any> | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [closing, setClosing] = useState<boolean>(false);
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
   * Close the ticket
   * @method
   */
  const closeTicket = async () => {
    setClosing(true);
    const response = await fetch(`/api/v1/ticket/${base32.encode(ticketID)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'close',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      message.success(data.message || 'Success', 2);
      setClosing(false);
      history.push('/tickets');
    } else {
      message.error(data.message || 'Error', 2);
      setClosing(false);
    }
  };

  /**
   * Fetch the help desk text
   * @method
   */
  const getHelpDeskText = async () => {
    const response = await fetch('/api/v1/ticket/text');
    const data = await response.json();
    setHelpDeskText(data);
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
                    disabled={ticketInfo?.status !== 'open'}
                  >
                    Resolve
                  </Button>
                )}
                <Popconfirm
                  title="Are you sure you want to close this ticket?"
                  onConfirm={() => closeTicket()}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    icon={<CloseCircleOutlined />}
                    danger
                    disabled={ticketInfo?.status !== 'open'}
                    loading={closing}
                  >
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
