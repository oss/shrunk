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

  return (
    <>
      <Title>Help Desk</Title>
      <Layout>
        <Sider>
          <Menu
            mode="vertical"
            selectedKeys={[selectedKey]}
            onClick={(e) => setSelectedKey(e.key)}
          >
            <Menu.Item key="table" icon={<TableOutlined />}>
              My Tickets
            </Menu.Item>
            <Menu.Item key="form" icon={<FormOutlined />}>
              Submit a Ticket
            </Menu.Item>
          </Menu>
        </Sider>
        <Content style={{ padding: '24px' }}>
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
