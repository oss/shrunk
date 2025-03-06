/**
 * Implement the [[ShrunkInput]] component
 * @packageDocumentation
 */

import { Input, InputProps } from 'antd/lib';
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
  <Input.Search {...defaultIcons} {...props} /> // eslint-disable-line
);

/**
 * Custom AntD Input component
 */
const ShrunkInput: React.FC<InputProps> & {
  Search: React.FC<SearchProps>;
} = (props) => <Input {...props} />; // eslint-disable-line

ShrunkInput.Search = ShrunkSearch;

export default ShrunkInput;
