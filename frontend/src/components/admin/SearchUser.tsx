/**
 * Implements the [[SearchUser]] component
 * @packageDocumentation
 */

import { SearchOutlined } from '@ant-design/icons';
import { AutoComplete } from 'antd/lib';
import React, { useCallback, useMemo, useState } from 'react';
import { User } from '../../contexts/Users';
import Fuse from 'fuse.js';

/**
 * Props for the [[SearchUser]] component
 * @interface
 */
interface SearchUserProps {
  /**
   * The list of users to search through
   * @property
   */
  users: User[];

  /**
   * Callback function to execute when the user searches for a user
   * @property
   */
  onSearch: (value: string) => void;
}

/**
 * The [[SearchUser]] component allows the user to search for users through NetId fuzzy searching
 * @class
 */
const SearchUser: React.FC<SearchUserProps> = ({ users, onSearch }) => {
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [value, setValue] = useState('');

  const fuse = useMemo(
    () =>
      new Fuse(users, {
        keys: ['netid'], // fuzzy search on netid; can add optionally other fields to search over
        threshold: 0.3,
        distance: 100,
      }),
    [users],
  );

  const handleSearch = useCallback(
    (searchValue: string) => {
      setValue(searchValue);

      if (!searchValue) {
        setOptions([]);
        onSearch('');
        return;
      }

      const results = fuse.search(searchValue);
      const newOptions = results.map(({ item }) => ({
        value: item.netid,
        label: item.netid,
      }));

      setOptions(newOptions);
      onSearch(searchValue);
    },
    [fuse, onSearch],
  );

  const handleSelect = useCallback(
    (selectedValue: string) => {
      setValue(selectedValue);
      onSearch(selectedValue);
    },
    [onSearch],
  );

  return (
    <AutoComplete
      style={{ width: '100%', minWidth: '200px' }}
      value={value}
      placeholder="Search for User"
      options={options}
      onChange={handleSearch}
      onSelect={handleSelect}
      allowClear
      suffixIcon={<SearchOutlined />}
    />
  );
};

export default SearchUser;
