/**
 * Implements the [[Security]] component
 * @packageDocumentation
 */

import React from 'react';
import { Typography } from 'antd';
import LinkSecurity from './LinkSecurity';

/**
 * The [[Security]] component displays everything related to link security
 * @returns the [[Security]] component
 */
const Security: React.FC = () => (
  <>
    <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>
      Security
    </Typography.Title>
    <LinkSecurity />
  </>
);

export default Security;
