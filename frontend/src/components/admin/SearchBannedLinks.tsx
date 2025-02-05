/**
 * Implements the [[SearchBannedLinks]] component
 * @packageDocumentation
 */

import { SearchOutlined } from '@ant-design/icons';
import { AutoComplete, Col } from 'antd/lib';
import React, { useState } from 'react';

// TODO --> Implement functionality here; this should perform a fuzzy search over netids, urls
/**
 * The [[SearchBannedLinks]] component allows the user to search for banned links based on criteria
 * Available filters include: URL, NetID
 * @class
 */
const SearchBannedLinks: React.FC = () => {
  
  const [errorMessage, setErrorMessage] = useState(
    'Filter string cannot be empty',
  );

  return (
    <Col>
        <AutoComplete
            style={{ width: '100%', minWidth: '200px' }}
            // options={filterStringOptions}
            // onSelect={handleOperationFilterStringChange}
            // onSearch={updateFilterStringOptions}
            placeholder="Search for Banned Links"
            suffixIcon={<SearchOutlined />}
        >
        </AutoComplete>
    </Col>
  );
};

export default SearchBannedLinks;