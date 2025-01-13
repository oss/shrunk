/**
 * Implements the Select component which allows the user to choose the types of links that are shown on dashboard
 * @packageDocumentation
 */

import React, { useRef, useState } from 'react';
import { Select } from 'antd/lib';
import { CaretDownOutlined, LoadingOutlined } from '@ant-design/icons';
import { OrgInfo } from '../api/Org';
import { SearchSet } from '../pages/Dashboard';

/**
 * Props for the [[OrgsSelect]] component
 * @interface
 */
export interface Props {
  /**
   * The user's privileges, used to determine whether the user may use the "all links" set
   * @property
   */
  userPrivileges: Set<string>;

  /**
   * The orgs of which the user is a member, used to display the list of
   * available link sets
   * @property
   */
  userOrgs: OrgInfo[];

  /**
   * Callback called when the user changes organization of whose links will be displayed
   * @property
   */
  showByOrg: (orgs: SearchSet) => void;
}

/**
 * The [[OrgsSelect]] component allows the user to choose specific filters which they want their links to be displayed
 * @param props The props
 */
export const OrgsSelect: React.FC<Props> = (props) => {
  const isAdmin = props.userPrivileges.has('admin');
  const [org, setOrg] = useState<number | string>(isAdmin ? 1 : 0);
  const [loading, toggle] = useState(false);
  const { Option, OptGroup } = Select;
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const updateOrg = async (e: any): Promise<void> => {
    toggle(true);
    setTimeout(() => {
      setOrg(e);
      const searchSet: SearchSet =
        e === 0
          ? { set: 'user' }
          : e === 1
          ? { set: 'all' }
          : e === 2
          ? { set: 'shared' }
          : { set: 'org', org: e as string };
      props.showByOrg(searchSet);
      toggle(false);
    }, 300);
  };

  return (
    <Select
      value={org}
      onChange={updateOrg}
      style={{ width: '100%' }}
      dropdownStyle={{ width: 175 }}
      open={dropdownOpen}
      onClick={() => {
        setDropdownOpen(!dropdownOpen);
      }}
      onBlur={() => {
        if (dropdownOpen === true) {
          setDropdownOpen(!dropdownOpen);
        }
      }}
    >
      <Option value={0}>My Links</Option>
      <Option value={2}>Shared with Me</Option>
      {!isAdmin ? <></> : <Option value={1}>All Links</Option>}
      {props.userOrgs.length !== 0 ? (
        <OptGroup label="My Organizations">
          {props.userOrgs.map((info) => (
            <Option key={info.id} value={info.id}>
              <em>{info.name}</em>
            </Option>
          ))}
        </OptGroup>
      ) : (
        <></>
      )}
    </Select>
  );
};
