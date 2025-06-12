/**
 * Implements the [[SearchUser]] component
 * @packageDocumentation
 */

import { AutoComplete } from 'antd/lib';
import { SearchIcon } from 'lucide-react';
import React, { useCallback, useState } from 'react';

/**
 * Props for the [[SearchUser]] component
 * @interface
 */
interface SearchUserProps {
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
const SearchUser: React.FC<SearchUserProps> = ({ onSearch }) => {
  const [value, setValue] = useState('');

  const handleSearch = useCallback(
    (searchValue: string) => {
      setValue(searchValue);
      if (!searchValue || searchValue.length < 1) {
        onSearch('');
        return;
      }
      onSearch(searchValue);
    },
    [onSearch],
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
      style={{ width: '100%', minWidth: '300px' }}
      value={value}
      placeholder="Search for user"
      onChange={handleSearch}
      onSelect={handleSelect}
      allowClear
      suffixIcon={<SearchIcon />}
    />
  );
};

export default SearchUser;
