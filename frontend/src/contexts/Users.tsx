import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * The representation of a user row in the table
 * @interface
 */
export interface User {
  /**
   * The netid of the user
   * @property
   */
  netid: string;

  /**
   * The organizations the user is a part of
   * @property
   */
  organizations: string[];

  /**
   * The roles the user has
   * @property
   */
  roles: string[];

  /**
   * The number of links the user has created
   * @property
   */
  linksCreated: number;
}

/**
 * The operation to be applied to the data
 * @interface
 */
export interface Operation {
  /**
   * The type of operation
   * @property
   */
  type: string;

  /**
   * The field to apply the operation to
   * @property
   */
  field: string;

  /**
   * The specification for the operation
   * @property
   */
  specification: string;

  /**
   * The value to filter by (numerical values are parsed as strings)
   * @property
   */
  filterString: string;
}

/**
 * Generate a key for the tag based on the operation. These keys are used to check if the operation is already being applied. They also help with rendering the tags, as each tag should have a unique key
 * @param operation - the operation to generate the key for
 * @returns the key for the tag
 */
export const generateOperationKey = (operation: Operation): string =>
  `${operation.type} ${operation.field} ${operation.specification} ${
    operation.type === 'filter' ? operation.filterString : ''
  }`;

// Define the shape of the context
interface UsersContextType {
  options: { [key: string]: any } | null;
  users: User[];
  loading: boolean;
  appliedOperations: Operation[];
  addOperation: (operation: Operation) => void;
  deleteOperation: (key: string) => void;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const useUsers = (): UsersContextType => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
};

const UsersProvider: React.FC = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [options, setOptions] = useState<{ [key: string]: any } | null>(null); // null to prevent TypeError
  const [loading, setLoading] = useState<boolean>(false);
  const [appliedOperations, setAppliedOperations] = useState<Operation[]>([
    {
      type: 'sort',
      field: 'netid',
      specification: 'asc',
      filterString: '',
    },
  ]);

  useEffect(() => {
    const fetchUsers = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await fetch('/api/v1/user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ operations: appliedOperations }),
        });
        if (!response.ok) {
          setUsers([]);
          throw new Error('Something went wrong');
        }
        const data = await response.json();
        setUsers(data.users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [appliedOperations]);

  useEffect(() => {
    const fetchOptions = async (): Promise<void> => {
      setLoading(true);
      try {
        const response = await fetch('/api/v1/user/options', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        setOptions(data.options);
      } catch (error) {
        console.error('Failed to fetch options:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  const addOperation = (operationToAdd: Operation): void => {
    setAppliedOperations((prevOperations) => [
      ...prevOperations,
      operationToAdd,
    ]);
  };

  const deleteOperation = (keyToDelete: string): void => {
    setAppliedOperations((prevOperations) =>
      prevOperations.filter(
        (operation) => generateOperationKey(operation) !== keyToDelete,
      ),
    );
  };

  return (
    <UsersContext.Provider
      value={{
        users,
        options,
        loading,
        appliedOperations,
        addOperation,
        deleteOperation,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export default UsersProvider;
