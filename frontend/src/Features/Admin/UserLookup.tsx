import { TrashIcon } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { downloadCsv, toCsv } from '@/Shared/Lib/Utils';
import { addRoleToUser, removeRoleFromUser } from '@/Features/Admin/Api';
import { User, useUsers } from '@/Features/Admin/UsersContext';
import useFuzzySearch from '@/Shared/Hooks/useFuzzySearch';
import LookupTableHeader from '@/Features/Admin/LookupTableHeader';
import PaginationControls from '@/Shared/PaginationControls';
import { useSession } from '@/App/useSession';
import { Button } from '@/Shared/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/Shared/ui/alert';
import { Badge } from '@/Shared/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Shared/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Shared/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/Shared/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/Shared/ui/alert-dialog';

const roleOrder = ['guest', 'whitelisted', 'facstaff', 'power_user', 'admin'];

const labelCase: Record<string, string> = {
  admin: 'Admin',
  whitelisted: 'Whitelisted',
  guest: 'Guest',
  power_user: 'Power User',
  facstaff: 'Faculty',
  blacklisted: 'Blacklisted',
  blocked_url: 'Blocked URL',
};

const roleChipClass: Record<string, string> = {
  admin:
    'border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
  whitelisted:
    'border border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300',
  power_user:
    'border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
  facstaff:
    'border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-300',
  guest: 'border border-border bg-muted text-muted-foreground',
  blacklisted:
    'border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
};

interface RolesSelectProps {
  initialRoles: string[];
  netid: string;
  onRolesChange: (netid: string, roles: string[]) => Promise<void>;
  rehydrateData: () => void;
  isSelf: boolean;
}

const RolesSelect: React.FC<RolesSelectProps> = ({
  initialRoles,
  netid,
  onRolesChange,
  rehydrateData,
  isSelf,
}) => {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    initialRoles.sort((a, b) => roleOrder.indexOf(b) - roleOrder.indexOf(a)),
  );
  const [loading, setLoading] = useState(false);

  const getHighestRole = (roles: string[]): string => {
    for (let i = roleOrder.length; i >= 0; i--) {
      const role = roleOrder[i];
      if (roles.includes(role)) {
        return role;
      }
    }
    return '';
  };

  const highestRole = getHighestRole(initialRoles);

  const availableRoles = roleOrder.filter(
    (role) =>
      !selectedRoles.includes(role) &&
      !(isSelf && role === highestRole) &&
      role !== 'guest',
  );

  const handleRolesChange = async (newRoles: string[]) => {
    if (newRoles.length === 0) {
      toast.warning('A user must have at least one role');
      return;
    }

    if (isSelf && highestRole && !newRoles.includes(highestRole)) {
      newRoles.push(highestRole);
      toast.warning('Cannot remove your highest privilege role');
    }

    setLoading(true);
    try {
      await onRolesChange(netid, newRoles);
      setSelectedRoles(
        newRoles.sort((a, b) => roleOrder.indexOf(b) - roleOrder.indexOf(a)),
      );
      toast.success('Roles updated successfully');
      rehydrateData();
    } catch {
      // The shared HTTP client already shows an error toast.
    } finally {
      setLoading(false);
    }
  };

  const removeRole = (roleToRemove: string) => {
    const isHighestRole = isSelf && roleToRemove === highestRole;
    if (isHighestRole) {
      toast.warning('Cannot remove your highest privilege role');
      return;
    }
    if (selectedRoles.length <= 1) {
      toast.warning('A user must have at least one role');
      return;
    }
    handleRolesChange(selectedRoles.filter((r) => r !== roleToRemove));
  };

  const addRole = (roleToAdd: string) => {
    if (!selectedRoles.includes(roleToAdd)) {
      handleRolesChange([...selectedRoles, roleToAdd]);
    }
  };

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1">
      {selectedRoles.map((role) => (
        <span
          key={role}
          className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium ${roleChipClass[role] ?? 'border border-border bg-muted text-muted-foreground'}`}
        >
          {labelCase[role.toLowerCase()] || role}
          {!(isSelf && role === highestRole) && selectedRoles.length > 1 && (
            <button
              type="button"
              aria-label={`Remove ${labelCase[role.toLowerCase()] || role} role`}
              className="ml-0.5 rounded-full text-foreground opacity-100 hover:opacity-100"
              onClick={() => removeRole(role)}
              disabled={loading}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {availableRoles.length > 0 && (
        <Select onValueChange={addRole} disabled={loading}>
          <SelectTrigger
            aria-label="Add role"
            className="ml-auto h-7 w-8 border-0 bg-transparent px-0 text-xs text-muted-foreground shadow-none focus:ring-0"
          >
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent className="border-border bg-popover text-popover-foreground">
            {availableRoles.map((role) => (
              <SelectItem
                key={role}
                value={role}
                className="focus:bg-accent focus:text-accent-foreground dark:focus:bg-white/8 dark:focus:text-white"
              >
                {labelCase[role] || role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

const renderOrganizations = (organizations: string[]): React.JSX.Element[] =>
  organizations.map((org) => (
    <Badge
      key={org}
      className="border-0 bg-muted px-2 py-0.5 text-muted-foreground shadow-none"
    >
      {org}
    </Badge>
  ));

const UserLookup: React.FC = () => {
  const {
    users,
    loading: usersLoading,
    error: usersError,
    rehydrateUsers,
    retry,
  } = useUsers();
  const { netid: currentNetid } = useSession();
  const [filteredData, setFilteredData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { search } = useFuzzySearch(users, {
    keys: ['netid', 'organizations', 'roles'],
    threshold: 0.3,
    distance: 100,
  });

  useEffect(() => {
    setFilteredData(users);
  }, [users]);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const exportToCSV = useCallback(() => {
    const dataToExport = filteredData.length > 0 ? filteredData : users;
    const csv = toCsv([
      ['NetID', 'Organizations', 'Roles', 'Links Created'],
      ...dataToExport.map((user) => [
        user.netid,
        user.organizations.join('; '),
        user.roles.join('; '),
        user.linksCreated,
      ]),
    ]);
    downloadCsv(`user_lookup_export_${new Date().toISOString()}.csv`, csv);
  }, [filteredData, users]);

  const handleRolesChange = async (netid: string, newRoles: string[]) => {
    setLoading(true);
    try {
      const existingRoles = users.find((u) => u.netid === netid)?.roles || [];

      await Promise.all(
        existingRoles.map((role) => {
          if (!newRoles.includes(role)) {
            return removeRoleFromUser(netid, role);
          }
          return Promise.resolve();
        }),
      );

      await Promise.all(
        newRoles.map((role) => {
          if (!existingRoles.includes(role)) {
            return addRoleToUser(
              netid,
              role,
              'Added via User Lookup interface',
            );
          }
          return Promise.resolve();
        }),
      );

      setFilteredData((prevData) =>
        prevData.map((user) =>
          user.netid === netid ? { ...user, roles: newRoles } : user,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (netid: string) => {
    try {
      const userRoles = users.find((u) => u.netid === netid)?.roles || [];

      await Promise.all(
        userRoles.map((role) => removeRoleFromUser(netid, role)),
      );

      await addRoleToUser(
        netid,
        'blacklisted',
        'User banned via User Lookup interface',
      );

      setFilteredData((prevData) =>
        prevData.map((user) =>
          user.netid === netid ? { ...user, roles: ['blacklisted'] } : user,
        ),
      );

      toast.success('User banned successfully');
    } catch {
      // The shared HTTP client already shows an error toast.
    }
  };

  const handleSort = (field: string) => {
    setSortOrder((prev) =>
      sortField === field && prev === 'asc' ? 'desc' : 'asc',
    );
    setSortField(field);
  };

  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      let cmp = 0;
      if (typeof aVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortField, sortOrder]);

  const handleSearch = (value: string) => {
    if (value) {
      setFilteredData(search(value).map((result) => result.item));
    } else {
      setFilteredData(users);
    }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const tableLoading = usersLoading || loading;

  const SortableHead = ({
    field,
    children,
  }: {
    field: string;
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-xs text-muted-foreground">
            {sortOrder === 'asc' ? '▲' : '▼'}
          </span>
        )}
      </div>
    </TableHead>
  );

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {usersError && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load users</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              <span>{usersError}</span>
              <Button size="sm" variant="outline" onClick={retry}>
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <LookupTableHeader
          rehydrateData={rehydrateUsers}
          onExportClick={exportToCSV}
          onSearch={handleSearch}
        />

        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow className="border-b border-border hover:bg-transparent">
                <SortableHead field="netid">NetID</SortableHead>
                <SortableHead field="organizations">Organizations</SortableHead>
                <SortableHead field="roles">Roles</SortableHead>
                <SortableHead field="linksCreated">Links Created</SortableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((record) => (
                  <TableRow key={record.netid}>
                    <TableCell className="font-semibold">
                      {record.netid}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {renderOrganizations(record.organizations)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RolesSelect
                        rehydrateData={rehydrateUsers}
                        initialRoles={record.roles}
                        netid={record.netid}
                        onRolesChange={handleRolesChange}
                        isSelf={record.netid === currentNetid}
                      />
                    </TableCell>
                    <TableCell>{record.linksCreated}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <AlertDialog>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Ban user ${record.netid}`}
                                >
                                  <TrashIcon />
                                </Button>
                              </AlertDialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>Ban</TooltipContent>
                          </Tooltip>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you sure you want to ban this user?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove all roles from {record.netid}{' '}
                                and blacklist them.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>No</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleBan(record.netid)}
                              >
                                Yes
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          label="users"
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>
    </TooltipProvider>
  );
};

export default UserLookup;
