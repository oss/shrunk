/**
 * Implement the [[ShrunkInput]] component
 * @packageDocumentation
 */

import { Input, InputProps } from 'antd';
import { SearchProps } from 'antd/lib/input';
import { SearchIcon } from 'lucide-react';
import React from 'react';

const defaultIcons = {
  enterButton: <SearchIcon />,
};

/**
 * Custom AntD Search component
 */
const ShrunkSearch: React.FC<SearchProps> = (props) => (
  <Input.Search {...defaultIcons} {...props} />
);

/**
 * Custom AntD Input component
 */
const ShrunkInput: React.FC<InputProps> & {
  Search: React.FC<SearchProps>;
} = (props) => <Input {...props} />;

ShrunkInput.Search = ShrunkSearch;

export default ShrunkInput;
