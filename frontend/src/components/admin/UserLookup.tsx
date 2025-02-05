/**
 * Implements the [[UserLookup]] component
 * @packageDocumentation
 */

import { Button, Col, Row, Table, Tag, Spin } from 'antd/lib';
import React, { useState } from 'react';
import {
  Operation,
  generateOperationKey,
  useUsers,
} from '../../contexts/Users';
import { ConfigProvider, Popconfirm, Select, SelectProps, Space, Tooltip, Typography } from 'antd';
import LookupTableHeader from './LookupTableHeader';
import { lightTheme } from '../../theme';
import { DeleteOutlined } from '@ant-design/icons';

/**
 * Renders the netids in bold
 * @param netids - the netids to render
 * @returns the rendered netids
 */
const renderNetIDs = (netids: string[]): JSX.Element[] =>
  netids.map((netid) => <strong key={netid}>{netid}</strong>);

const roleOrder = ['whitelisted', 'facstaff', 'power_user', 'admin'];
const roleColors: Record<string, string> = {
  admin: 'volcano',
  whitelisted: 'green',
  power_user: 'geekblue',
  facstaff: 'purple',
};

interface RolesSelectProps {
  initialRoles: string[];
}

// TODO - Update the onChange function to (persistently) update the roles of the user rather than just visually
/**
 * Renders a selection component for roles
 * @param roles - the roles to render
 * @returns the rendered roles
 */
const RolesSelect: React.FC<RolesSelectProps> = ({ initialRoles }) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(initialRoles);

  const options = roleOrder.map((role) => ({
    label: role.toUpperCase(),
    value: role,
  }));

  // Filter out already selected roles for the dropdown.
  const filteredOptions = options.filter(
    (option) => !selectedRoles.includes(option.value),
  );

  // Render tags in color using tagRender
  const tagRender = (props: any) => {
    const { label, value, closable, onClose } = props;
    return (
      <Tag
        color={roleColors[value] || 'default'}
        closable={closable}
        onClose={onClose}
        style={{ marginRight: 3 }}
      >
        {label}
      </Tag>
    );
  };

  return (
    <Space style={{ width: '100%' }} direction="vertical">
      <Select
        mode="multiple"
        allowClear
        style={{ width: '100%' }}
        placeholder="Please select roles"
        value={selectedRoles}
        onChange={setSelectedRoles}
        options={filteredOptions}
        tagRender={tagRender}
      />
    </Space>
  );
};

/**
 * Renders the ban button for a user
 * @param netid - the netid of the user to ban
 * @returns the rendered ban button
 */
const renderBanButton = (netid: string): JSX.Element => {
  const handleBan = () => {
    // TODO: Implement the ban functionality
    console.log(`Banning user: ${netid}`);
  };

  return (
    <Tooltip title="Ban">
      <Popconfirm
        title="Are you sure you want to ban this user?"
        onConfirm={handleBan}
        okText="Yes"
        cancelText="No"
        okButtonProps={{ danger: true }}
      >
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
        />
      </Popconfirm>
    </Tooltip>
  );
};

/**
 * Renders the organizations as regular tags
 * @param organizations - the organizations to render
 * @returns the rendered organizations
 */
const renderOrganizations = (organizations: string[]): JSX.Element[] =>
  organizations.map((org) => <Tag key={org}>{org}</Tag>);

/**
 * The [[UserLookup]] component displays a table of users and allows the user to search/filter/add users given
 * certain criteria determined by the admin.
 * @returns the [[UserLookup]] component
 */
const UserLookup: React.FC = () => {
  const { users, options, loading, appliedOperations, deleteOperation } =
    useUsers();

  const [organizationsFilters, rolesFilters] = React.useMemo(() => {
    let distinctOrganizations: Set<string> = new Set()
    let distinctRoles: Set<string> = new Set()
    
    // Fetches distinct orgs/roles from all users; no flatten method in current JS version
    users.forEach(user => {
      // This is a bit of a hack; Sets natively use === for comparison which doesn't work for objects
      user.organizations.forEach(org => distinctOrganizations.add(JSON.stringify({text: org, value: org})))
      user.roles.forEach(org => distinctRoles.add(JSON.stringify({text: org.toString().toUpperCase(), value: org})))
    })

    // Parse back into JSON objects
    return [Array.from(distinctOrganizations).map(el => JSON.parse(el)), Array.from(distinctRoles).map(el => JSON.parse(el))]; 
  }, [users]);

  const columns = [
    {
      title: 'NetID',
      dataIndex: 'netid',
      key: 'netid',
      render: (netid: string) => renderNetIDs([netid]),
      sorter: (a: any, b: any) => a.netid.localeCompare(b.netid),
      sortDirections: ['ascend', 'descend'] as const,
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: 'Organizations',
      dataIndex: 'organizations',
      key: 'organizations',
      render: (organizations: string[]) => renderOrganizations(organizations),
      filters: organizationsFilters,
      onFilter: (value: string | number | boolean, record: any) => record.organizations.includes(value.toString()),
      filterMultiple: true,
      filterOnClose: true,
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => <RolesSelect initialRoles={roles} />,
      filters: rolesFilters,
      onFilter: (value: string | number | boolean, record: any) => record.roles.includes(value.toString()),
      filterMultiple: true,
      filterOnClose: true,
    },
    {
      title: 'Links Created',
      dataIndex: 'linksCreated',
      key: 'linksCreated',
      sorter: (a: any, b: any) => a.linksCreated - b.linksCreated,
      sortDirections: ['ascend', 'descend'] as const,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: 'Actions',
      dataIndex: 'netid',
      key: 'ban',
      render: (netid: string) => renderBanButton(netid),
    },
  ];

  return (
    <>
      <Row className="secondary-row" style={{ marginBottom: 0 }}>
        <Col>
            <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>User Lookup</Typography.Title>
              <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 16, color: '#4F4F4F' }}>{users.length} Result{users.length > 1 && "s"} Found</Typography.Title>
            </div>
        </Col>
      </Row>

      {/* Re-provide theme context to component */}
      <ConfigProvider theme={lightTheme}>
        <LookupTableHeader />
      </ConfigProvider>

      <Row style={{ marginBottom: 24 }} />

      {loading ? (
        <Spin size="large" />
      ) : (
        <>
          <Table
            columns={columns}
            dataSource={users}
            rowKey="netid"
            pagination={{ position: ['bottomCenter'], pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        </>
      )}
    </>
  );
};

export default UserLookup;
