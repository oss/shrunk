/**
 * Implements the [[ManageUserAccess]] component
 * @packageDocumentation
 */

import { Button, Col, Row, Table, Tag, Spin } from 'antd/lib';
import React from 'react';
import {
  Operation,
  useUsers,
} from '../../contexts/Users';
import { ConfigProvider, Typography } from 'antd';
import LookupTableHeader from './LookupTableHeader';
import { lightTheme } from '../../theme';
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
    console.log("ManageUserAccess props: ", props);
  return (
    <>
      <Row className="secondary-row" style={{ marginBottom: 0 }}>
        <Col>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>Pending Requests</Typography.Title>
            </div>
        </Col>
      </Row>
      <PendingRoleRequests name={"power_user"} userPrivileges={props.userPrivileges} />
    </>
  );
};

export default ManageUserAccess;
