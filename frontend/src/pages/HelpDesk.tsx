import { FormOutlined, TableOutlined } from '@ant-design/icons';
import { Layout, Menu, Typography } from 'antd/lib';
import React, { useState } from 'react';
import TicketForm from '../components/TicketForm';
import TicketTable from '../components/TicketTable';

const { Sider, Content } = Layout;
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
  const [selectedKey, setSelectedKey] = useState('table');

  const menuItems = [
    {
      key: 'table',
      icon: <TableOutlined />,
      label: 'My Tickets',
    },
    {
      key: 'form',
      icon: <FormOutlined />,
      label: 'New Ticket',
    },
  ];

  return (
    <>
      <Title>Help Desk</Title>
      <Layout>
        <Sider>
          <Menu
            mode="vertical"
            selectedKeys={[selectedKey]}
            onClick={(e) => setSelectedKey(e.key)}
            items={menuItems}
          />
        </Sider>
        <Content style={{ paddingLeft: '1rem' }}>
          {selectedKey === 'table' ? (
            <TicketTable netid={netid} />
          ) : (
            <TicketForm netid={netid} />
          )}
        </Content>
      </Layout>
    </>
  );
};

export default HelpDesk;
