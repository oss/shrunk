import { DeleteOutlined } from '@ant-design/icons';
import { Descriptions } from 'antd';
import { App, Button, Card, Col, Popconfirm, Row, Typography } from 'antd/lib';
import dayjs from 'dayjs';
import base32 from 'hi-base32';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { TicketInfo, EntityPositionInfo } from '../../types';

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
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [entityPositionInfo, setEntityPositionInfo] =
    useState<EntityPositionInfo | null>(null);
  const [helpDeskText, setHelpDeskText] = useState<any>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const history = useHistory();
  const { message } = App.useApp();

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
   */
  const deleteTicket = async () => {
    const response = await fetch(`/api/v1/ticket/${base32.encode(ticketID)}`, {
      method: 'DELETE',
    });

    if (response.status === 204) {
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

  useEffect(() => {
    const fetchData = async () => {
      await fetchTicket();
      if (userPrivileges.has('admin') && ticketInfo?.entity) {
        await fetchEntityPositionInfo();
      }
      await fetchHelpDeskText();
    };

    fetchData();
  }, [ticketInfo?.entity]);

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title>Ticket {ticketID}</Title>
            </Col>
            <Col>
              <Popconfirm
                title="Are you sure you want to delete this ticket?"
                onConfirm={() => deleteTicket()}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button icon={<DeleteOutlined />} danger>
                  Delete
                </Button>
              </Popconfirm>
            </Col>
          </Row>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={userPrivileges.has('admin') ? 12 : 24}>
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
