/**
 * Implements the [[UserLookup]] component
 * @packageDocumentation
 */

import { PlusOutlined } from '@ant-design/icons';
import { AutoComplete, Button, Col, InputNumber, Row, Select } from 'antd/lib';
import React, { useEffect, useState } from 'react';
import {
  useUsers,
  Operation,
  User,
  generateOperationKey,
} from '../contexts/Users';

const { Option } = Select;

/**
 * Get all unique netids from the data
 * @param data - the data to get the netids from
 * @returns  all unique netids from the data
 */
const getAllNetids = (data: User[]): string[] => [
  ...new Set(data.map((item) => item.netid)),
];

/**
 * Get all unique organizations from the data
 * @param data - the data to get the organizations from
 * @returns all unique organizations from the data
 */
const getAllOrganizations = (data: User[]): string[] => [
  ...new Set(
    data.reduce((acc: string[], item) => acc.concat(item.organizations), []),
  ),
];

/**
 * Get all unique roles from the data
 * @param data - the data to get the roles from
 * @returns all unique roles from the data
 */
const getAllRoles = (data: User[]): string[] => [
  ...new Set(data.reduce((acc: string[], item) => acc.concat(item.roles), [])),
];

/**
 * The [[SearchUser]] component allows the user to search for users based on certain criteria.
 * The user can filter and sort the users based on their netid, organizations, roles, and links created.
 * The operation must validated before being applied to the data.
 * @class
 */
const SearchUser: React.FC = () => {
  const { users, options, appliedOperations, addOperation } = useUsers();
  const [currentOperation, setCurrentOperation] = useState<Operation>({
    type: '',
    field: '',
    specification: '',
    filterString: '',
  });
  const [filterStringOptions, setFilterStringOptions] = useState<
    {
      value: string;
    }[]
  >([]);
  const [errorMessage, setErrorMessage] = useState(
    'Filter string cannot be empty',
  );

  useEffect(() => {
    if (options) {
      setCurrentOperation({
        type: options.TYPE_OPTIONS[0],
        field: options.FIELD_OPTIONS[0],
        specification: options.SPECIFICATION_FILTER_STRING_OPTIONS[0],
        filterString: '',
      });
    }
  }, [options]);

  /**
   * Set the operation type to the given value. If the operation type is set to 'sort', the specification
   * is set to 'desc' and the filter string is set to an empty string. Otherwise (set to 'filter'), the
   * specification is set to 'contains', 'matches', or 'gt' depending on the field
   * @param newType - the value to set the operation type to
   */
  const handleOperationTypeChange = (newType: Operation['type']): void => {
    let updatedOperation = {
      ...currentOperation,
      type: newType,
    };

    if (newType === 'sort') {
      updatedOperation = {
        ...updatedOperation,
        specification: options?.SPECIFICATION_SORT_OPTIONS[0],
        filterString: '',
      };
    } else if (newType === 'filter') {
      if (options?.FIELD_STRING_OPTIONS?.includes(updatedOperation.field)) {
        updatedOperation = {
          ...updatedOperation,
          specification: options?.SPECIFICATION_FILTER_STRING_OPTIONS[0], // default to 'matches'
          filterString: '',
        };
      } else if (
        options?.FIELD_NUMBER_OPTIONS.includes(updatedOperation.field)
      ) {
        updatedOperation = {
          ...updatedOperation,
          specification: options?.SPECIFICATION_FILTER_NUMBER_OPTIONS[0], // default to 'lt'
          filterString: '',
        };
      } else {
        // options?.FIELD_ARRAY_STRING_OPTIONS.includes(updatedOperation.field)
        updatedOperation = {
          ...updatedOperation,
          specification: options?.SPECIFICATION_FILTER_ARRAY_STRING_OPTIONS[0], // default to 'contains'
          filterString: '',
        };
      }
    }

    setCurrentOperation(updatedOperation);
  };

  /**
   * Set the operation field to the given value. If the operation type is set to 'filter', the specification will
   * be set to 'contains', 'matches', or 'gt' depending on the field
   * @param newField - the value to set the operation field to
   */
  const handleOperationFieldChange = (newField: Operation['field']): void => {
    let updatedOperation = { ...currentOperation, field: newField };

    if (updatedOperation.type === 'filter') {
      if (options?.FIELD_STRING_OPTIONS.includes(updatedOperation.field)) {
        updatedOperation = {
          ...updatedOperation,
          specification: options?.SPECIFICATION_FILTER_STRING_OPTIONS[0], // default to 'matches'
          filterString: '',
        };
      } else if (
        options?.FIELD_NUMBER_OPTIONS.includes(updatedOperation.field)
      ) {
        updatedOperation = {
          ...updatedOperation,
          specification: options?.SPECIFICATION_FILTER_NUMBER_OPTIONS[0], // default to 'lt'
          filterString: '',
        };
      } else if (
        options?.FIELD_ARRAY_STRING_OPTIONS.includes(updatedOperation.field)
      ) {
        updatedOperation = {
          ...updatedOperation,
          specification: options?.SPECIFICATION_FILTER_ARRAY_STRING_OPTIONS[0], // default to 'contains'
          filterString: '',
        };
      }
    }

    setCurrentOperation(updatedOperation);
  };

  /**
   * Set the operation specification to the given value
   * @param newSpecification - the value to set the operation specification to
   */
  const handleOperationSpecificationChange = (
    newSpecification: Operation['specification'],
  ): void => {
    setCurrentOperation({
      ...currentOperation,
      specification: newSpecification,
    });
  };

  /**
   * Set the operation filter string to the given value
   * @param newFilterString - the new value for the filter string
   */
  const handleOperationFilterStringChange = (newFilterString: string): void => {
    setCurrentOperation({
      ...currentOperation,
      filterString: newFilterString,
    });
  };

  /**
   * Apply the current operation by adding it to the list of applied operations.
   */
  const handleApplyOperation = (): void => {
    addOperation(currentOperation);
    if (currentOperation.type === 'filter') {
      setCurrentOperation({
        ...currentOperation,
        filterString: '',
      });
    }
  };

  /**
   * Update the filter string options based on the search text
   */
  const updateFilterStringOptions = (searchText: string): void => {
    let newOptions: { value: string }[] = [];

    if (currentOperation.field === 'netid') {
      newOptions = getAllNetids(users)
        .filter((netid) => netid.startsWith(searchText))
        .map((netid) => ({ value: netid }));
    } else if (currentOperation.field === 'organizations') {
      newOptions = getAllOrganizations(users)
        .filter((organization) => organization.startsWith(searchText))
        .map((organization) => ({ value: organization }));
    } else if (currentOperation.field === 'roles') {
      newOptions = getAllRoles(users)
        .filter((role) => role.startsWith(searchText))
        .map((role) => ({ value: role }));
    }

    setFilterStringOptions(newOptions);
  };

  /**
   * Check if the filter string is empty
   * @returns whether the filter string is empty
   */
  const checkIfFilterStringEmpty = (): boolean =>
    currentOperation.filterString === '';

  const checkIfFilterStringIsNumeric = (): boolean =>
    !Number.isNaN(Number(currentOperation.filterString));

  const checkIfFilterStringIsInOptions = (): boolean =>
    filterStringOptions.some(
      (option) => option.value === currentOperation.filterString,
    );

  /**
   * Check if the operation already exists in the list of applied operations
   * @param operation - the operation to check
   * @returns whether the operation exists
   */
  const checkIfOperationExists = (operation: Operation): boolean =>
    appliedOperations.some(
      (appliedOperation) =>
        generateOperationKey(appliedOperation) ===
        generateOperationKey(operation),
    );

  /**
   * Check if the number of operations exceeds the maximum number of operations
   * @returns whether the number of operations exceeds the maximum number of operations
   */
  const checkIfExceedMaximumOperations = (): boolean =>
    appliedOperations.length >= 10;

  /**
   * Check if there are multiple sorts for the same field
   * @param operation - the operation to check
   * @returns whether there are multiple sorts for the same field
   */
  const checkIfMultipleSortsForSameField = (operation: Operation): boolean =>
    appliedOperations.some(
      (appliedOperation) =>
        appliedOperation.type === 'sort' &&
        appliedOperation.field === operation.field &&
        appliedOperation.specification !== operation.specification,
    );

  /**
   * Handle the key down event for the filter string input. If the key is 'Enter' and there is no error
   * message, apply the operation. This is because the filter string input and submit button are two separate
   * elements
   * @param event the key down event
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && errorMessage === '') {
      event.preventDefault(); // Prevent the default action
      handleApplyOperation();
    }
  };

  /**
   * Check if there are any errors with the current operation and update the error message accordingly
   */
  const checkAndUpdateError = () => {
    if (checkIfExceedMaximumOperations()) {
      setErrorMessage('Cannot have more than 10 operations');
    } else if (
      currentOperation.type === 'filter' &&
      checkIfFilterStringEmpty()
    ) {
      setErrorMessage('Filter string cannot be empty');
    } else if (
      currentOperation.type === 'filter' &&
      options?.FIELD_NUMBER_OPTIONS.includes(currentOperation.field) &&
      !checkIfFilterStringIsNumeric()
    ) {
      setErrorMessage('Filter number must be a number'); // never happens
    } else if (
      currentOperation.type === 'filter' &&
      !options?.FIELD_NUMBER_OPTIONS.includes(currentOperation.field) &&
      !checkIfFilterStringIsInOptions()
    ) {
      setErrorMessage('Filter string must be a valid option');
    } else if (
      currentOperation.type === 'sort' &&
      checkIfMultipleSortsForSameField(currentOperation)
    ) {
      setErrorMessage('Cannot have multiple sorts for the same field');
    } else if (checkIfOperationExists(currentOperation)) {
      setErrorMessage('Operation is already being applied');
    } else {
      setErrorMessage('');
    }
  };

  useEffect(() => {
    checkAndUpdateError();
    updateFilterStringOptions(currentOperation.filterString);
  }, [currentOperation, appliedOperations]);

  return (
    <>
      <Row className="lookup-row" gutter={0}>
        <Col className="lookup-col" xs={24} sm={24} md={3}>
          <Select
            className="lookup-select"
            onChange={handleOperationTypeChange}
            placeholder="Type"
            value={currentOperation.type}
            onKeyDown={handleKeyDown}
          >
            {options?.TYPE_OPTIONS.map((type: string) => (
              <Option key={type} value={type}>
                {options?.INTERNAL_TO_EXTERNAL[type]}
              </Option>
            ))}
          </Select>
        </Col>
        <Col className="lookup-col" xs={24} sm={24} md={3}>
          <Select
            className="lookup-select"
            onChange={handleOperationFieldChange}
            placeholder="Field"
            disabled={!currentOperation.type} // should never happen
            value={currentOperation.field}
          >
            {options?.FIELD_OPTIONS.map((field: string) => (
              <Option key={field} value={field}>
                {options?.INTERNAL_TO_EXTERNAL[field]}
              </Option>
            ))}
          </Select>
        </Col>
        <Col className="lookup-col" xs={24} sm={24} md={3}>
          <Select
            className="lookup-select"
            onChange={handleOperationSpecificationChange}
            placeholder="Specification"
            disabled={!currentOperation.type && !currentOperation.field} // should never happen
            value={currentOperation.specification}
          >
            {currentOperation.type === 'sort'
              ? options?.SPECIFICATION_SORT_OPTIONS.map(
                  (specification: string) => (
                    <Option key={specification} value={specification}>
                      {options?.INTERNAL_TO_EXTERNAL[specification]}
                    </Option>
                  ),
                )
              : currentOperation.type === 'filter'
              ? options?.FIELD_STRING_OPTIONS.includes(currentOperation.field)
                ? options?.SPECIFICATION_FILTER_STRING_OPTIONS.map(
                    (specification: string) => (
                      <Option key={specification} value={specification}>
                        {options?.INTERNAL_TO_EXTERNAL[specification]}
                      </Option>
                    ),
                  )
                : options?.FIELD_NUMBER_OPTIONS.includes(currentOperation.field)
                ? options?.SPECIFICATION_FILTER_NUMBER_OPTIONS.map(
                    (specification: string) => (
                      <Option key={specification} value={specification}>
                        {options?.INTERNAL_TO_EXTERNAL[specification]}
                      </Option>
                    ),
                  )
                : options?.FIELD_ARRAY_STRING_OPTIONS.includes(
                    currentOperation.field,
                  )
                ? options?.SPECIFICATION_FILTER_ARRAY_STRING_OPTIONS.map(
                    (specification: string) => (
                      <Option key={specification} value={specification}>
                        {options?.INTERNAL_TO_EXTERNAL[specification]}
                      </Option>
                    ),
                  )
                : null
              : null}
          </Select>
        </Col>
        <Col className="lookup-col" xs={24} sm={24} md={14}>
          {options?.FIELD_NUMBER_OPTIONS.includes(currentOperation.field) ? (
            <InputNumber
              className="lookup-search"
              style={{ width: '100%' }} // HACK: className is not working for some reason
              placeholder={options?.FILTER_NUMBER_PLACEHOLDER}
              value={currentOperation.filterString}
              onChange={(value) => {
                const stringValue: string = value?.toString() || '';
                if (
                  (!stringValue.startsWith('0') || stringValue === '0') &&
                  stringValue.length <= 10 // limit to 10 digits
                ) {
                  handleOperationFilterStringChange(stringValue);
                }
              }}
              disabled={currentOperation.type === 'sort'}
            />
          ) : (
            <AutoComplete
              autoFocus
              className="lookup-search"
              placeholder={options?.FILTER_STRING_PLACEHOLDER}
              onChange={(value) => {
                if (value.length <= 150) {
                  // limit to 150 characters
                  handleOperationFilterStringChange(value);
                }
              }}
              disabled={currentOperation.type === 'sort'}
              value={currentOperation.filterString}
              onKeyDown={handleKeyDown}
              options={filterStringOptions}
              onSearch={updateFilterStringOptions}
            />
          )}
        </Col>
        <Col className="lookup-col" xs={24} sm={24} md={1}>
          <Button
            className="lookup-button"
            style={{ width: '100%' }} // HACK: className is not working for some reason
            type="primary"
            onClick={handleApplyOperation}
            icon={<PlusOutlined />}
            disabled={errorMessage !== ''}
          />
        </Col>
      </Row>
      <div className="error">
        {errorMessage !== '' ? errorMessage : '\u00A0'}{' '}
        {/* HACK: Space character to maintain height */}
      </div>
    </>
  );
};

export default SearchUser;
