/**
 * Implements some components used across multiple org pages
 * @packageDocumentation
 */

import React from 'react';
import { Tag, Tooltip } from 'antd';

/**
 * A tag indicating the user is an admin of an org
 * @param props The props
 */
export const OrgAdminTag: React.FC<{ title: string }> = (props) => (
  <Tag color="magenta">
    <Tooltip title={props.title}>Admin</Tooltip>
  </Tag>
);

/**
 * A tag indicating the user is a member of an org
 * @param _props The props
 */
export const OrgMemberTag: React.FC = (_props) => (
  <Tag color="blue">
    <Tooltip title="You are a member of this organization.">Member</Tooltip>
  </Tag>
);
