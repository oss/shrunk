/**
 * Implements the [[UserLookup]] component
 * @packageDocumentation
 */

import { Button, Col, Row, Table, Tag, Spin } from 'antd/lib';
import React from 'react';
import { IoReturnUpBack } from 'react-icons/io5';
import SearchUser from '../SearchUser';
import './UserLookup.css';
import {
  Operation,
  generateOperationKey,
  useUsers,
} from '../../contexts/Users';

/**
 * Renders the netids in bold
 * @param netids - the netids to render
 * @returns the rendered netids
 */
const renderNetIDs = (netids: string[]): JSX.Element[] =>
  netids.map((netid) => <strong key={netid}>{netid}</strong>);

/**
 * Renders the roles as colored tags
 * @param roles - the roles to render
 * @returns the rendered roles
 */
const renderRoles = (roles: string[]): JSX.Element[] => {
  const roleOrder = ['whitelisted', 'facstaff', 'power_user', 'admin'];
  const sortedRoles = roles.sort(
    (a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b),
  );
  return sortedRoles.map((role) => {
    let color;
    switch (role) {
      case 'admin':
        color = 'volcano';
        break;
      case 'whitelisted':
        color = 'green';
        break;
      case 'power_user':
        color = 'geekblue';
        break;
      case 'facstaff':
        color = 'purple';
        break;
      default:
        color = 'default';
    }
    return (
      <Tag color={color} key={role}>
        {role.toUpperCase()}
      </Tag>
    );
  });
};

/**
 * Renders the organizations as regular tags
 * @param organizations - the organizations to render
 * @returns the rendered organizations
 */
const renderOrganizations = (organizations: string[]): JSX.Element[] =>
  organizations.map((org) => <Tag key={org}>{org}</Tag>);

const columns = [
  {
    title: 'NetID',
    dataIndex: 'netid',
    key: 'netid',
    render: (netid: string) => renderNetIDs([netid]),
  },
  {
    title: 'Organizations',
    dataIndex: 'organizations',
    key: 'organizations',
    render: (organizations: string[]) => renderOrganizations(organizations),
  },
  {
    title: 'Roles',
    dataIndex: 'roles',
    key: 'roles',
    render: (roles: string[]) => renderRoles(roles),
  },
  {
    title: 'Links Created',
    dataIndex: 'linksCreated',
    key: 'linksCreated',
  },
];

/**
 * The [[UserLookup]] component displays a table of users and allows the user to search for users given
 * certain criteria determined by the admin. The user can add multiple operations to filter and sort the users.
 * The user can also delete operations that have been applied
 * @returns the [[UserLookup]] component
 */
const UserLookup: React.FC = () => {
  const { users, options, loading, appliedOperations, deleteOperation } =
    useUsers();

  /**
   * Display the operation in a human-readable format to fill the tag
   * @param operation - the operation to display
   * @returns the human-readable format of the operation
   */
  const renderOperation = (operation: Operation): string =>
    `${options?.INTERNAL_TO_EXTERNAL[operation.type]} ${
      options?.INTERNAL_TO_EXTERNAL[operation.field]
    } ${options?.INTERNAL_TO_EXTERNAL[operation.specification]} ${
      operation.type === 'filter' ? operation.filterString : ''
    }`.toUpperCase();

  return (
    <>
      <Row className="primary-row">
        <Col span={24}>
          <Button
            type="text"
            href="/app/#/admin"
            icon={<IoReturnUpBack />}
            size="large"
          />
          <span className="page-title">User Lookup</span>
        </Col>
      </Row>
      <SearchUser />
      <div className="operation-tags">
        {appliedOperations.map((operation) => (
          <Tag
            key={generateOperationKey(operation)}
            closable
            onClose={() => deleteOperation(generateOperationKey(operation))}
          >
            {renderOperation(operation)}
          </Tag>
        ))}
      </div>

      {loading ? (
        <Spin size="large" />
      ) : (
        <>
          <p className="num-users">Number of users: {users.length}</p>
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
