/**
 * Implements the [[UserLookup]] component
 * @packageDocumentation
 */

import {
  Button,
  Flex,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType, TableProps } from 'antd/lib/table';
import type { SorterResult } from 'antd/lib/table/interface';
import { TrashIcon } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { addRoleToUser, removeRoleFromUser } from '../../api/users';
import { User, useUsers } from '../../contexts/Users';
import useFuzzySearch from '../../lib/hooks/useFuzzySearch';
import LookupTableHeader from './LookupTableHeader';

/**
 * Order of roles in the select dropdown
 * @constant
 */
const roleOrder = ['guest', 'whitelisted', 'facstaff', 'power_user', 'admin'];

/**
 * Colors for each role in the select dropdown
 * @constant
 */
const roleColors: Record<string, string> = {
  admin: 'volcano',
  whitelisted: 'green',
  power_user: 'geekblue',
  facstaff: 'purple',
  guest: 'orange',
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

  const labelCase = {
    admin: 'Admin',
    whitelisted: 'Whitelisted',
    guest: 'Guest',
    power_user: 'Power User',
    facstaff: 'Faculty',
    blacklisted: 'Blacklisted',
    blocked_url: 'Blocked URL',
  };

  const options = roleOrder.map((role) => ({
    label: role,
    value: role,
    disabled: role === getHighestRole(initialRoles) || role === 'guest',
  }));

  const filteredOptions = options.filter(
    (option) => !selectedRoles.includes(option.value) || option.disabled,
  );

  /**
   * Handles the change in roles for the user. Updates the roles in the backend and UI.
   * Ensures that users do not revoke highest privilege rol from themselves.
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
      message.error(`Failed to update roles: ${error}`);
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
        {labelCase[label.toLowerCase() as keyof typeof labelCase]}
      </Tag>
    );
  };

  return (
    <Space style={{ width: '100%' }} orientation="vertical">
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
 * The [[UserLookup]] component allows the current user to search for users and manage their roles
 * @class
 */
const UserLookup: React.FC = () => {
  const { users, loading: usersLoading, rehydrateUsers } = useUsers();
  const [filteredData, setFilteredData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  const { search } = useFuzzySearch(users, {
    keys: ['netid', 'organizations', 'roles'],
    threshold: 0.3,
    distance: 100,
  });

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
      user.roles.forEach((role) =>
        distinctRoles.add(
          JSON.stringify({ text: role.toString().toUpperCase(), value: role }),
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
      const existingRoles = users.find((u) => u.netid === netid)?.roles || [];

      // Remove roles that are no longer selected
      await Promise.all(
        existingRoles.map((role) => {
          if (!newRoles.includes(role)) {
            return removeRoleFromUser(netid, role);
          }
          return Promise.resolve();
        }),
      );

      // Add newly selected roles
      await Promise.all(
        newRoles.map((role) => {
          if (!existingRoles.includes(role)) {
            return addRoleToUser(
              netid,
              role,
              'Added via User Lookup interface',
            );
          }
          return Promise.resolve();
        }),
      );

      setFilteredData((prevData) =>
        prevData.map((user) =>
          user.netid === netid ? { ...user, roles: newRoles } : user,
        ),
      );
    } catch (error) {
      message.error(`Error updating roles: ${error}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (netid: string) => {
    try {
      const userRoles = users.find((u) => u.netid === netid)?.roles || [];

      // Remove user from all roles
      await Promise.all(
        userRoles.map((role) => removeRoleFromUser(netid, role)),
      );

      await addRoleToUser(
        netid,
        'blacklisted',
        'User banned via User Lookup interface',
      );

      setFilteredData((prevData) =>
        prevData.map((user) =>
          user.netid === netid ? { ...user, roles: ['blacklisted'] } : user,
        ),
      );

      message.success('User banned successfully');
    } catch (error) {
      message.error(`Failed to ban user ${error}`);
    }
  };

  const handleTableChange: TableProps<User>['onChange'] = (
    pagination,
    filters,
    sorter,
  ) => {
    if (pagination.pageSize) {
      setPageSize(pagination.pageSize);
    }
    let newData = [...users];

    Object.keys(filters).forEach((key) => {
      const selectedFilters = filters[key];
      if (selectedFilters && selectedFilters.length > 0) {
        newData = newData.filter((record) => {
          if (key === 'organizations' || key === 'roles') {
            return (selectedFilters as string[]).some((filter: string) =>
              record[key as 'organizations' | 'roles'].includes(filter),
            );
          }
          return false;
        });
      }
    });

    // Apply sorting
    const sortResult = sorter as SorterResult<User>;
    if (sortResult.field && typeof sortResult.field === 'string') {
      newData.sort((a: any, b: any) => {
        let compareResult = 0;
        const aValue = a[sortResult.field as string];
        const bValue = b[sortResult.field as string];

        if (typeof aValue === 'string') {
          compareResult = aValue.localeCompare(bValue);
        } else {
          compareResult = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }

        return sortResult.order === 'ascend' ? compareResult : -compareResult;
      });
    }

    setFilteredData(newData);
  };

  const handleSearch = (value: string) => {
    if (value) {
      setFilteredData(search(value).map((result) => result.item));
    } else {
      setFilteredData(users);
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: 'NetID',
      dataIndex: 'netid',
      key: 'netid',
    },
    {
      title: 'Organizations',
      dataIndex: 'organizations',
      key: 'organizations',
      render: renderOrganizations,
      filters: organizationsFilters,
      onFilter: (value, record) =>
        record.organizations.includes(value as string),
      filterMultiple: true,
      filterOnClose: true,
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[], record: User) => (
        <RolesSelect
          rehydrateData={rehydrateUsers}
          initialRoles={roles}
          netid={record.netid}
          onRolesChange={handleRolesChange}
        />
      ),
      filters: rolesFilters,
      onFilter: (value, record) => record.roles.includes(value as string),
      filterMultiple: true,
      filterOnClose: true,
    },
    {
      title: 'Links Created',
      dataIndex: 'linksCreated',
      key: 'linksCreated',
    },
    {
      title: () => <Flex justify="flex-end">Actions</Flex>,
      key: 'actions',
      render: (_: any, record: User) => (
        <Flex justify="flex-end">
          <Tooltip title="Ban">
            <Popconfirm
              title="Are you sure you want to ban this user?"
              onConfirm={() => handleBan(record.netid)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" danger icon={<TrashIcon />} />
            </Popconfirm>
          </Tooltip>
        </Flex>
      ),
    },
  ];

  return (
    <>
      <LookupTableHeader
        rehydrateData={rehydrateUsers}
        onExportClick={exportToCSV}
        onSearch={handleSearch}
      />

      <Row style={{ marginBottom: 24 }} />

      <Table
        loading={usersLoading || loading}
        columns={columns}
        dataSource={filteredData}
        rowKey="netid"
        pagination={{
          position: ['bottomCenter'],
          pageSize,
          showSizeChanger: true,
          hideOnSinglePage: false,
        }}
        scroll={{ x: 'max-content' }}
        onChange={handleTableChange}
      />
    </>
  );
};

export default UserLookup;
