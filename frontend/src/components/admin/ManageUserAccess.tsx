/**
 * Implements the [[ManageUserAccess]] component
 * @packageDocumentation
 */

import React from 'react';
import { Typography } from 'antd';
import { PendingRoleRequests } from './PendingRoleRequests';

interface ManageUserAccessProps {
  userNetid: string;
  userPrivileges: Set<string>;
}

/**
 * The [[ManageUserAccess]] component displays a table of pending power user requests. Admins can manage
 * and approve/deny these requests through this component.
 * @returns the [[ManageUserAccess]] component
 */
const ManageUserAccess: React.FC<ManageUserAccessProps> = (props) => {
  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>
        Pending Requests
      </Typography.Title>
      <PendingRoleRequests
        name={'power_user'}
        userPrivileges={props.userPrivileges}
      />
    </>
  );
};

export default ManageUserAccess;
