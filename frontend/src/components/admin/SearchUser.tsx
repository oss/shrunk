/**
 * Implements the [[SearchUser]] component
 * @packageDocumentation
 */

import { SearchIcon } from 'lucide-react';
import React, { useCallback, useState } from 'react';

import { Input } from '@/components/ui/input';

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
  placeholder?: string;
  inputClassName?: string;
  iconClassName?: string;
}

/**
 * The [[SearchUser]] component allows the user to search for users through NetId fuzzy searching
 * @class
 */
const SearchUser: React.FC<SearchUserProps> = ({
  onSearch,
  placeholder = 'Search for user',
  inputClassName,
  iconClassName,
}) => {
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

  return (
    <div className="relative w-full min-w-0">
      <SearchIcon
        className={`absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 ${iconClassName ?? ''}`}
      />
      <Input
        aria-label={placeholder}
        value={value}
        className={`pl-9 ${inputClassName ?? ''}`}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
};

export default SearchUser;
