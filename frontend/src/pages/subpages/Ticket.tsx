import { DeleteOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Popconfirm,
  Row,
  Typography,
  message,
} from 'antd/lib';
import base32 from 'hi-base32';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { TicketInfo } from '../../types';

const { Title } = Typography;
const { useMessage } = message;

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
  const [helpDeskText, setHelpDeskText] = useState<any>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [messageApi, contextHolder] = useMessage();
  const history = useHistory();

  /**
   * Delete the ticket
   *
   * @method
   */
  const deleteTicket = async () => {
    const response = await fetch(`/api/v1/ticket/${base32.encode(ticketID)}`, {
      method: 'DELETE',
    });

    if (response.status === 204) {
      if (userPrivileges.has('admin')) {
        history.push('/admin/tickets');
      } else {
        history.push('/tickets');
      }
    } else {
      messageApi.error('Failed to delete ticket');
    }
  };

  /**
   * Fetch the ticket information
   * @method
   */
  //   const fetchTicket = async () => {
  //     setLoading(true);
  //     const response = await fetch(`/api/v1/ticket/${base32.encode(ticketID)}`);
  //     const body = await response.json();
  //     setTicketInfo(body);
  //     setLoading(false);
  //   };

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
    // fetchTicket();
    fetchHelpDeskText();
  }, []);

  return (
    <>
      {contextHolder}
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
        <Col span={24}>
          <Card>Test</Card>
        </Col>
      </Row>
    </>
  );
};

export default Ticket;
