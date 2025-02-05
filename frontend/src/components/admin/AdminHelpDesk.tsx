import { Spin, Typography } from 'antd/lib';
import React, { useEffect, useState } from 'react';
import TicketTable from '../TicketTable';

const { Title } = Typography;

interface Props {
  /**
   * NetID of the user
   * @property
   */
  netid: string;

  /**
   * A set of the user's privileges.
   * @property
   */
  userPrivileges: Set<string>;
}

/**
 * Component for the help desk page
 */
const AdminHelpDesk: React.FC<Props> = ({ netid, userPrivileges }) => {
  /**
   * State for the [[TicketTable]] component
   *
   * loading: Whether the component is loading
   * helpDeskText: Fetch the help desk text
   */
  const [loading, setLoading] = useState<boolean>(false);
  const [helpDeskText, setHelpDeskText] = useState<any>(false);

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
        <TicketTable
          netid={netid}
          userPrivileges={userPrivileges}
          helpDeskText={helpDeskText}
        />
      )}
    </>
  );
};

export default AdminHelpDesk;
