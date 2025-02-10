/**
 * Implements the [[SearchBannedLinks]] component
 * @packageDocumentation
 */

import { SearchOutlined } from '@ant-design/icons';
import { AutoComplete } from 'antd/lib';
import React, { useCallback, useMemo, useState } from 'react';
import Fuse from 'fuse.js';

/**
 * Props for the [[SearchBannedLinks]] component
 * @interface
 */
interface SearchBannedLinksProps {
  /**
   * List of blocked links. Values are used for filtering/sorting
   * @property
   */
  blockedLinks: Array<{
    url: string;
    blockedBy: string;
  }>;

  /**
   * Callback function to execute when the user searches for a banned link
   * @property
   */
  onSearch: (value: string) => void;
}

/**
 * The [[SearchBannedLinks]] component allows the user to search for banned links based on criteria
 * Available filters include: URL, NetID
 * @class
 */
const SearchBannedLinks: React.FC<SearchBannedLinksProps> = ({
  blockedLinks,
  onSearch,
}) => {
  const [value, setValue] = useState('');

  const fuse = useMemo(
    () =>
      new Fuse(blockedLinks, {
        keys: ['url', 'blockedBy'],
        threshold: 0.3,
        distance: 100,
      }),
    [blockedLinks],
  );

  const handleSearch = useCallback(
    (searchValue: string) => {
      setValue(searchValue);

      if (!searchValue) {
        onSearch('');
        return;
      }

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
      style={{ width: '100%', minWidth: '300px' }}
      value={value}
      onChange={handleSearch}
      onSelect={handleSelect}
      allowClear
      placeholder="Search by URL or NetID"
      suffixIcon={<SearchOutlined />}
    />
  );
};

export default SearchBannedLinks;
