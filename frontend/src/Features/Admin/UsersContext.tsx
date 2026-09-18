import React, { createContext, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getAllUsers, getUserOptions } from '@/Features/Admin/Api';
import { Operation, User } from '@/Features/Admin/Types';
import { getErrorMessage } from '@/Shared/Lib/Http';

export type { Operation, User };

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
  error: string | null;
  appliedOperations: Operation[];
  addOperation: (operation: Operation) => void;
  deleteOperation: (key: string) => void;
  rehydrateUsers: () => void;
  retry: () => void;
}

const UsersContext = createContext<UsersContextType>({
  options: null,
  users: [],
  loading: false,
  error: null,
  appliedOperations: [],
  addOperation: () => {},
  deleteOperation: () => {},
  rehydrateUsers: () => {},
  retry: () => {},
});

export const useUsers = (): UsersContextType => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useOperations must be used within an OperationsProvider');
  }
  return context;
};

const UsersProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const [appliedOperations, setAppliedOperations] = useState<Operation[]>([
    {
      type: 'sort',
      field: 'netid',
      specification: 'asc',
      filterString: '',
    },
  ]);

  const usersQuery = useQuery({
    queryKey: ['admin-users', appliedOperations],
    queryFn: () => getAllUsers(appliedOperations),
  });
  const optionsQuery = useQuery({
    queryKey: ['admin-user-options'],
    queryFn: getUserOptions,
  });

  // Re-fetch users when there are user modifications without a page refresh
  const rehydrateUsers = (): void => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  };

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
        users: usersQuery.data ?? [],
        options: optionsQuery.data ?? null,
        loading: usersQuery.isPending,
        error: usersQuery.isError
          ? getErrorMessage(usersQuery.error, 'Failed to load users.')
          : null,
        appliedOperations,
        addOperation,
        deleteOperation,
        rehydrateUsers,
        retry: () => usersQuery.refetch(),
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export default UsersProvider;
