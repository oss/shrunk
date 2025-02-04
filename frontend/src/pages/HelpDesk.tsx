import { FormOutlined, TableOutlined } from '@ant-design/icons';
import { Tabs, Typography, Spin } from 'antd/lib';
import React, { useState, useEffect } from 'react';
import TicketForm from '../components/TicketForm';
import TicketTable from '../components/TicketTable';

const { Title } = Typography;

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
}

/**
 * Component for the help desk page
 */
const HelpDesk: React.FC<Props> = ({ netid }) => {
  /**
   * State for the [[TicketTable]] component
   *
   * loading: Whether the component is loading
   * helpDeskText: Fetch the help desk text
   */
  const [loading, setLoading] = useState<boolean>(false);
  const [helpDeskText, setHelpDeskText] = useState<any>(false);

  const tabItems = [
    {
      key: 'table',
      icon: <TableOutlined />,
      label: 'My Tickets',
      children: <TicketTable netid={netid} helpDeskText={helpDeskText} />,
    },
    {
      key: 'form',
      icon: <FormOutlined />,
      label: 'New Ticket',
      children: <TicketForm helpDeskText={helpDeskText} />,
    },
  ];

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
    fetchHelpDeskText();
  }, []);

  return (
    <>
      <Title>Help Desk</Title>
      {loading ? (
        <Spin size="large" />
      ) : (
        <Tabs tabPosition="left" items={tabItems} destroyInactiveTabPane />
      )}
    </>
  );
};

export default HelpDesk;
