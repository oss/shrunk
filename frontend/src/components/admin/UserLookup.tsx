/**
 * Implements the [[UserLookup]] component
 * @packageDocumentation
 */

import {
  Button,
  Row,
  Table,
  Tag,
  Spin,
  Popconfirm,
  Select,
  Space,
  Tooltip,
  Typography,
  message,
  Flex,
} from 'antd/lib';
import React, { useState, useCallback, useEffect } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import base32 from 'hi-base32';
import { useUsers } from '../../contexts/Users';
import LookupTableHeader from './LookupTableHeader';

/**
 * Renders the netids in bold
 * @param netids - the netids to render
 * @returns the rendered netids as bold elements
 */
const renderNetIDs = (netids: string[]): JSX.Element[] =>
  netids.map((netid) => <strong key={netid}>{netid}</strong>);

/**
 * Order of roles in the select dropdown
 * @constant
 */
const roleOrder = ['whitelisted', 'facstaff', 'power_user', 'admin'];

/**
 * Colors for each role in the select dropdown
 * @constant
 */
const roleColors: Record<string, string> = {
  admin: 'volcano',
  whitelisted: 'green',
  power_user: 'geekblue',
  facstaff: 'purple',
};

/**
 * Props for the RolesSelect component
 * @interface
 */
interface RolesSelectProps {
  /**
   * Initial roles for the user
   * @property
   */
  initialRoles: string[];

  /**
   * NetID of the user
   * @property
   */
  netid: string;

  /**
   * Callback function to execute when the user's roles change
   * @property
   */
  onRolesChange: (netid: string, roles: string[]) => Promise<void>;

  /**
   * Callback function to force rehydrate the data
   * @property
   */
  rehydrateData: () => void;
}

/**
 * The RolesSelect component allows the current user to select roles for a specific user within the table
 * @class
 */
const RolesSelect: React.FC<RolesSelectProps> = ({
  initialRoles,
  netid,
  onRolesChange,
  rehydrateData,
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    // Sort roles in descending order of privilege
    initialRoles.sort((a, b) => roleOrder.indexOf(b) - roleOrder.indexOf(a)),
  );
  const [loading, setLoading] = useState(false);

  const getHighestRole = (roles: string[]): string => {
    for (let i = roleOrder.length; i >= 0; i--) {
      const role = roleOrder[i];
      if (roles.includes(role)) {
        return role;
      }
    }
    return '';
  };

  const options = roleOrder.map((role) => ({
    label: role.toUpperCase(),
    value: role,
    disabled: role === getHighestRole(initialRoles),
  }));

  const filteredOptions = options.filter(
    (option) => !selectedRoles.includes(option.value) || option.disabled,
  );

  /**
   * Handles the change in roles for the user. Updates the roles in the backend and UI.
   * Ensures that users do not revoke highest privilege role from themselves.
   * @param newRoles - the new roles to assign to the user
   */
  const handleRolesChange = async (newRoles: string[]) => {
    const highestRole = getHighestRole(initialRoles);

    if (highestRole && !newRoles.includes(highestRole)) {
      newRoles.push(highestRole);
      message.warning('Cannot remove your highest privilege role');
    }

    setLoading(true);
    try {
      await onRolesChange(netid, newRoles);
      setSelectedRoles(
        newRoles.sort((a, b) => roleOrder.indexOf(b) - roleOrder.indexOf(a)),
      );
      message.success('Roles updated successfully');

      rehydrateData();
    } catch (error) {
      message.error('Failed to update roles');
      console.error('Error updating roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const tagRender = (props: any) => {
    const { label, value, closable, onClose } = props;
    const isHighestRole = value === getHighestRole(initialRoles);

    return (
      <Tag
        color={roleColors[value] || 'default'}
        closable={!isHighestRole && closable}
        onClose={onClose}
        style={{ marginRight: 3 }}
      >
        {label.toLowerCase()}
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
        onChange={handleRolesChange}
        options={filteredOptions}
        tagRender={tagRender}
        disabled={loading}
      />
    </Space>
  );
};

const renderOrganizations = (organizations: string[]): JSX.Element[] =>
  organizations.map((org) => <Tag key={org}>{org}</Tag>);

/**
 * User data interface
 * @interface
 */
interface UserData {
  /**
   * NetID of the user
   * @property
   */
  netid: string;

  /**
   * Organizations the user is a part of
   * @property
   */
  organizations: string[];

  /**
   * Roles the user has
   * @property
   */
  roles: string[];

  /**
   * Number of links created by the user
   * @property
   */
  linksCreated: number;
}

interface TableFilters {
  [key: string]: string[];
}

interface TableSorter {
  field?: string;
  order?: 'ascend' | 'descend';
}

interface TablePagination {
  current?: number;
  pageSize?: number;
}

/**
 * The [[UserLookup]] component allows the current user to search for users and manage their roles
 * @class
 */
const UserLookup: React.FC = () => {
  const { users, loading: usersLoading, rehydrateUsers } = useUsers();
  const [loading, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState<UserData[]>([]);
  const [searchText, setSearchText] = useState('');

  // Initialize filtered data with all users when component mounts or users change
  useEffect(() => {
    setFilteredData(users);
  }, [users]);

  const exportToCSV = useCallback(() => {
    const dataToExport = filteredData.length > 0 ? filteredData : users;
    const csvContent = [
      ['NetID', 'Organizations', 'Roles', 'Links Created'].join(','),
      ...dataToExport.map((user) =>
        [
          user.netid,
          `"${user.organizations.join('; ')}"`,
          `"${user.roles.join('; ')}"`,
          user.linksCreated,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `user_lookup_export_${new Date().toISOString()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredData, users]);

  const [organizationsFilters, rolesFilters] = React.useMemo(() => {
    const distinctOrganizations: Set<string> = new Set();
    const distinctRoles: Set<string> = new Set();

    users.forEach((user) => {
      user.organizations.forEach((org) =>
        distinctOrganizations.add(JSON.stringify({ text: org, value: org })),
      );
      user.roles.forEach((org) =>
        distinctRoles.add(
          JSON.stringify({ text: org.toString().toUpperCase(), value: org }),
        ),
      );
    });

    return [
      Array.from(distinctOrganizations).map((el) => JSON.parse(el)),
      Array.from(distinctRoles).map((el) => JSON.parse(el)),
    ];
  }, [users]);

  const handleRolesChange = async (netid: string, newRoles: string[]) => {
    setLoading(true);
    try {
      const encodedNetId = base32.encode(netid);
      const existingRoles = users.find((u) => u.netid === netid)?.roles || [];

      // Remove roles that are no longer selected
      for (const role of existingRoles) {
        if (!newRoles.includes(role)) {
          await fetch(`/api/v1/role/${role}/entity/${encodedNetId}`, {
            method: 'DELETE',
          });
        }
      }

      // Add newly selected roles
      for (const role of newRoles) {
        if (!existingRoles.includes(role)) {
          await fetch(`/api/v1/role/${role}/entity/${encodedNetId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              comment: `Added via User Lookup interface`,
            }),
          });
        }
      }

      setFilteredData((prevData) =>
        prevData.map((user) =>
          user.netid === netid ? { ...user, roles: newRoles } : user,
        ),
      );
    } catch (error) {
      console.error('Error updating roles:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (netid: string) => {
    try {
      const encodedNetId = base32.encode(netid);
      const userRoles = users.find((u) => u.netid === netid)?.roles || [];

      // Remove user from all roles
      for (const role of userRoles) {
        await fetch(`/api/v1/role/${role}/entity/${encodedNetId}`, {
          method: 'DELETE',
        });
      }

      // Add the "blacklisted" role to signify the user is banned
      await fetch(`/api/v1/role/blacklisted/entity/${encodedNetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: 'User banned via User Lookup interface',
        }),
      });

      setFilteredData((prevData) =>
        prevData.map((user) =>
          user.netid === netid ? { ...user, roles: ['blacklisted'] } : user,
        ),
      );

      message.success('User banned successfully');
    } catch (error) {
      console.error('Error banning user:', error);
      message.error('Failed to ban user');
    }
  };

  const handleTableChange = (
    pagination: TablePagination,
    filters: TableFilters,
    sorter: TableSorter,
  ) => {
    let newData = [...users];

    Object.keys(filters).forEach((key) => {
      const selectedFilters = filters[key];
      if (selectedFilters && selectedFilters.length > 0) {
        newData = newData.filter((record) => {
          if (key === 'organizations' || key === 'roles') {
            return selectedFilters.some((filter: string) =>
              record[key as 'organizations' | 'roles'].includes(filter),
            );
          }
          return false;
        });
      }
    });

    // Apply sorting
    if (sorter.field) {
      newData.sort((a: any, b: any) => {
        let compareResult = 0;
        const aValue = a[sorter.field!];
        const bValue = b[sorter.field!];

        if (typeof aValue === 'string') {
          compareResult = aValue.localeCompare(bValue);
        } else {
          compareResult = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }

        return sorter.order === 'ascend' ? compareResult : -compareResult;
      });
    }

    // Apply search text filter
    if (searchText) {
      newData = newData.filter(
        (user) =>
          user.netid.toLowerCase().includes(searchText.toLowerCase()) ||
          user.organizations.some((org) =>
            org.toLowerCase().includes(searchText.toLowerCase()),
          ) ||
          user.roles.some((role) =>
            role.toLowerCase().includes(searchText.toLowerCase()),
          ),
      );
    }

    setFilteredData(newData);
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    let newData = [...users];

    if (value) {
      newData = newData.filter(
        (user) =>
          user.netid.toLowerCase().includes(value.toLowerCase()) ||
          user.organizations.some((org) =>
            org.toLowerCase().includes(value.toLowerCase()),
          ) ||
          user.roles.some((role) =>
            role.toLowerCase().includes(value.toLowerCase()),
          ),
      );
    }

    setFilteredData(newData);
  };

  const columns = [
    {
      title: 'NetID',
      dataIndex: 'netid',
      key: 'netid',
      render: (netid: string) => renderNetIDs([netid]),
      sorter: true,
      sortDirections: ['ascend', 'descend'] as const,
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: 'Organizations',
      dataIndex: 'organizations',
      key: 'organizations',
      render: renderOrganizations,
      filters: organizationsFilters,
      onFilter: (value: string | number | boolean, record: any) =>
        record.organizations.includes(value.toString()),
      filterMultiple: true,
      filterOnClose: true,
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[], record: any) => (
        <RolesSelect
          rehydrateData={rehydrateUsers}
          initialRoles={roles}
          netid={record.netid}
          onRolesChange={handleRolesChange}
        />
      ),
      filters: rolesFilters,
      onFilter: (value: string | number | boolean, record: any) =>
        record.roles.includes(value.toString()),
      filterMultiple: true,
      filterOnClose: true,
    },
    {
      title: 'Links Created',
      dataIndex: 'linksCreated',
      key: 'linksCreated',
      sorter: true,
      sortDirections: ['ascend', 'descend'] as const,
      defaultSortOrder: 'descend' as const,
    },
    {
      title: () => <Flex justify="flex-end">Actions</Flex>,
      key: 'actions',
      render: (_: any, record: any) => (
        <Flex justify="flex-end">
          <Tooltip title="Ban">
            <Popconfirm
              title="Are you sure you want to ban this user?"
              onConfirm={() => handleBan(record.netid)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Flex>
      ),
    },
  ];

  return (
    <>
      <Flex gap="1rem" align="baseline">
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>
          User Lookup
        </Typography.Title>
        <Typography.Title
          level={5}
          style={{ marginTop: 0, marginBottom: 16, color: '#4F4F4F' }}
        >
          {filteredData.length} Result{filteredData.length !== 1 && 's'} Found
        </Typography.Title>
      </Flex>

      <LookupTableHeader
        users={users}
        rehydrateData={rehydrateUsers}
        onExportClick={exportToCSV}
        onSearch={handleSearch}
      />

      <Row style={{ marginBottom: 24 }} />

      {usersLoading || loading ? (
        <Spin size="large" />
      ) : (
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="netid"
          pagination={{ position: ['bottomCenter'], pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          onChange={handleTableChange}
        />
      )}
    </>
  );
};

export default UserLookup;
