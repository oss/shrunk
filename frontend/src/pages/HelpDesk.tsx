import { FormOutlined, TableOutlined } from '@ant-design/icons';
import { Tabs, Typography } from 'antd/lib';
import React from 'react';
import TicketForm from '../components/TicketForm';
import TicketTable from '../components/TicketTable';

const { Title } = Typography;

/**
 * Props for the [[HelpDesk]] component
 * @interface
 */
interface Props {
  /**
   * The NetID of the currently logged in user
   * @property
   */
  netid: string;
}

/**
 * Component for the help desk page
 */
const HelpDesk: React.FC<Props> = ({ netid }) => {
  const tabItems = [
    {
      key: 'table',
      icon: <TableOutlined />,
      label: 'My Tickets',
      children: <TicketTable />,
    },
    {
      key: 'form',
      icon: <FormOutlined />,
      label: 'New Ticket',
      children: <TicketForm netid={netid} />,
    },
  ];

  return (
    <>
      <Title>Help Desk</Title>
      <Tabs tabPosition="left" items={tabItems} destroyInactiveTabPane />
    </>
  );
};

export default HelpDesk;
