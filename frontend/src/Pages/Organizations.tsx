import {
  EyeIcon,
  PlusCircleIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FilterIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  createOrg,
  deleteOrganization,
  searchOrgs,
  hasAssociatedUrls,
} from '@/Api/Organization';
import { getErrorMessage, getFieldError } from '@/Api/Client';
import { serverValidateNetId } from '@/Api/Validators';
import { Organization, OrgSearchQuery } from '@/Interfaces/Organizations';
import { Button } from '@/Components/ui/button';
import { ButtonGroup } from '@/Components/ui/button-group';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Checkbox } from '@/Components/ui/checkbox';
import { Badge } from '@/Components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import useDebounce from '@/Lib/Hooks/useDebounce';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/Components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/Components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/Components/ui/tooltip';

interface Props {
  userPrivileges: Set<string>;
}

interface FilterFormProps {
  query: OrgSearchQuery;
  setQuery: React.Dispatch<React.SetStateAction<OrgSearchQuery>>;
  onSearch: () => void;
  isAdmin: boolean;
  memberNetidError: string | null;
  setMemberNetidError: React.Dispatch<React.SetStateAction<string | null>>;
}

const DEFAULT_QUERY: OrgSearchQuery = {
  query: '',
  show_all: false,
  filter_deleted: false,
  filter_role: [],
  filter_member: '',
  sort: { key: 'timeCreated', order: 'descending' },
  pagination: { skip: 0, limit: 10 },
};
const organizationControlBorderClass =
  'border border-border bg-muted text-foreground shadow-none hover:bg-accent hover:text-foreground';
const organizationInputClass =
  'border-border bg-muted text-foreground placeholder:text-muted-foreground shadow-none';
const organizationLabelClass = 'text-sm font-semibold text-foreground';
const organizationSegmentButtonClass =
  'h-8 min-w-fit px-4 text-sm font-semibold';
const organizationInactiveButtonClass =
  'border border-border bg-muted text-foreground shadow-none hover:bg-accent hover:text-foreground';
const organizationActiveButtonClass =
  'border border-primary bg-primary text-primary-foreground shadow-none hover:bg-primary/90 hover:text-primary-foreground';

const FilterForm = ({
  query,
  setQuery,
  onSearch,
  isAdmin,
  memberNetidError,
  setMemberNetidError,
}: FilterFormProps) => (
  <div className="space-y-5">
    <div className="space-y-2">
      <Label className={organizationLabelClass}>Sort by</Label>
      <Select
        value={query.sort.key}
        onValueChange={(val) =>
          setQuery((prev) => ({
            ...prev,
            sort: {
              ...prev.sort,
              key: val as OrgSearchQuery['sort']['key'],
            },
          }))
        }
      >
        <SelectTrigger
          aria-label="Sort organizations by"
          className={`h-9 ${organizationControlBorderClass}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="timeCreated">Time Created</SelectItem>
          <SelectItem value="name">Name</SelectItem>
          <SelectItem value="memberCount">Member Count</SelectItem>
          <SelectItem value="dateAdded">Date Added</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div className="space-y-2">
      <Label className={organizationLabelClass}>Has Member</Label>
      <Input
        aria-label="Filter organizations by member"
        placeholder="NetID"
        className={`h-9 ${organizationInputClass}`}
        value={query.filter_member}
        onChange={(e) => {
          setMemberNetidError(null);
          setQuery((prev) => ({
            ...prev,
            filter_member: e.target.value,
          }));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSearch();
        }}
      />
      {memberNetidError && (
        <p className="text-sm text-destructive">{memberNetidError}</p>
      )}
    </div>

    <div className="space-y-2">
      <Label className={organizationLabelClass}>My Role</Label>
      <div className="space-y-2.5">
        {(['admin', 'member', 'guest'] as const).map((role) => (
          <label
            key={role}
            className="flex min-h-4 cursor-pointer items-center gap-2 text-sm leading-none font-semibold text-foreground"
          >
            <Checkbox
              aria-label={`${role.charAt(0).toUpperCase() + role.slice(1)} role`}
              className="border-border data-[state=checked]:border-primary"
              checked={query.filter_role?.includes(role) ?? false}
              onCheckedChange={(checked) => {
                setQuery((prev) => ({
                  ...prev,
                  filter_role: checked
                    ? [...(prev.filter_role ?? []), role]
                    : (prev.filter_role ?? []).filter((r) => r !== role),
                }));
              }}
            />
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </label>
        ))}
        {query.show_all && (
          <label
            htmlFor="filter-role-not-member"
            className="flex min-h-4 cursor-pointer items-center gap-2 text-sm leading-none font-semibold text-foreground"
          >
            <Checkbox
              id="filter-role-not-member"
              className="border-border data-[state=checked]:border-primary"
              checked={query.filter_role?.includes('not_member') ?? false}
              onCheckedChange={(checked) => {
                setQuery((prev) => ({
                  ...prev,
                  filter_role: checked
                    ? [...(prev.filter_role ?? []), 'not_member']
                    : (prev.filter_role ?? []).filter(
                        (r) => r !== 'not_member',
                      ),
                }));
              }}
            />
            Not a member
          </label>
        )}
      </div>
    </div>

    <div className="flex flex-col items-start gap-2">
      <Label className={`block ${organizationLabelClass}`}>Sort Order</Label>
      <Button
        variant="outline"
        className={`h-9 w-fit px-4 ${organizationControlBorderClass}`}
        onClick={() =>
          setQuery((prev) => ({
            ...prev,
            sort: {
              ...prev.sort,
              order:
                prev.sort.order === 'ascending' ? 'descending' : 'ascending',
            },
          }))
        }
      >
        {query.sort.order === 'ascending' ? <ArrowUpIcon /> : <ArrowDownIcon />}
        {query.sort.order.charAt(0).toUpperCase() + query.sort.order.slice(1)}
      </Button>
    </div>

    {isAdmin && (
      <div className="space-y-2">
        <Label className={organizationLabelClass}>All Organizations</Label>
        <ButtonGroup className="w-fit max-w-full">
          <Button
            variant={!query.show_all ? 'default' : 'outline'}
            className={`${organizationSegmentButtonClass} ${!query.show_all ? organizationActiveButtonClass : organizationInactiveButtonClass}`}
            onClick={() => {
              setQuery((prev) => ({
                ...prev,
                show_all: false,
                filter_role: (prev.filter_role ?? []).filter(
                  (r) => r !== 'not_member',
                ),
                pagination: { ...prev.pagination, skip: 0 },
              }));
            }}
          >
            Hide
          </Button>
          <Button
            variant={query.show_all ? 'default' : 'outline'}
            className={`${organizationSegmentButtonClass} ${query.show_all ? organizationActiveButtonClass : organizationInactiveButtonClass}`}
            onClick={() => {
              setQuery((prev) => ({
                ...prev,
                show_all: true,
                pagination: { ...prev.pagination, skip: 0 },
              }));
            }}
          >
            Show
          </Button>
        </ButtonGroup>
      </div>
    )}

    {isAdmin && (
      <div className="space-y-2">
        <Label className={organizationLabelClass}>Deleted Organizations</Label>
        <ButtonGroup className="w-fit max-w-full">
          <Button
            variant={!query.filter_deleted ? 'default' : 'outline'}
            className={`${organizationSegmentButtonClass} ${!query.filter_deleted ? organizationActiveButtonClass : organizationInactiveButtonClass}`}
            onClick={() =>
              setQuery((prev) => ({
                ...prev,
                filter_deleted: false,
              }))
            }
          >
            Hide
          </Button>
          <Button
            variant={query.filter_deleted ? 'default' : 'outline'}
            className={`${organizationSegmentButtonClass} ${query.filter_deleted ? organizationActiveButtonClass : organizationInactiveButtonClass}`}
            onClick={() =>
              setQuery((prev) => ({
                ...prev,
                filter_deleted: true,
              }))
            }
          >
            Show
          </Button>
        </ButtonGroup>
      </div>
    )}
  </div>
);

const orgRoleFormat: Record<string, string> = {
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};

export default function MyOrganizations({
  userPrivileges,
}: Props): React.ReactElement {
  const [orgs, setOrgs] = useState<Organization[] | null>(null);
  const [totalOrgs, setTotalOrgs] = useState<number>(0);
  const [query, setQuery] = useState<OrgSearchQuery>(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showAssociatedUrlsAlert, setShowAssociatedUrlsAlert] = useState(false);
  const [memberNetidError, setMemberNetidError] = useState<string | null>(null);
  const [orgLoadError, setOrgLoadError] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [createOrgError, setCreateOrgError] = useState<string | null>(null);

  const [deleteConfirmOrgId, setDeleteConfirmOrgId] = useState<string | null>(
    null,
  );

  const isAdmin = userPrivileges.has('admin');
  const mayCreateOrg =
    userPrivileges.has('admin') || userPrivileges.has('facstaff');

  const debouncedQuery = useDebounce(query, 300);

  const [lastActiveColumn, setLastActiveColumn] = useState<
    'timeCreated' | 'memberCount' | 'dateAdded'
  >('timeCreated');

  useEffect(() => {
    if (
      query.sort.key === 'timeCreated' ||
      query.sort.key === 'memberCount' ||
      query.sort.key === 'dateAdded'
    ) {
      setLastActiveColumn(query.sort.key);
    }
  }, [query.sort.key]);

  const refreshOrgs = useCallback(async () => {
    try {
      const memberNetid = debouncedQuery.filter_member?.trim() || '';
      const normalizedQuery = {
        ...debouncedQuery,
        filter_member: memberNetid,
      };

      if (memberNetid) {
        try {
          await serverValidateNetId(memberNetid);
          setMemberNetidError(null);
        } catch (error) {
          setMemberNetidError(
            getErrorMessage(error, 'That NetID is not valid.'),
          );
          return;
        }
      } else {
        setMemberNetidError(null);
      }

      const data = await searchOrgs(normalizedQuery);
      setOrgs(data.results);
      setTotalOrgs(data.count);
      setOrgLoadError(null);
    } catch (error) {
      setOrgLoadError(getErrorMessage(error, 'Unable to load organizations.'));
    }
  }, [debouncedQuery]);

  useEffect(() => {
    refreshOrgs();
  }, [refreshOrgs]);

  const onSearch = useCallback(() => {
    setQuery((prev) => ({
      ...prev,
      query: searchInput,
      pagination: { ...prev.pagination, skip: 0 },
    }));
    setCurrentPage(1);
  }, [searchInput]);

  const setPage = (page: number) => {
    setCurrentPage(page);
    setQuery((prev) => ({
      ...prev,
      pagination: {
        ...prev.pagination,
        skip: (page - 1) * prev.pagination.limit,
      },
    }));
  };

  const onCreate = async () => {
    const cleanedName = newOrgName.trim().replace(/\s+/g, ' ');
    if (!cleanedName) {
      setCreateOrgError('Enter an organization name.');
      return;
    }

    setIsCreatingOrg(true);
    setCreateOrgError(null);
    try {
      await createOrg(cleanedName);
      toast.success('Organization created successfully');
      setIsCreateModalOpen(false);
      setNewOrgName('');
      await refreshOrgs();
    } catch (error) {
      const message =
        getFieldError(error, 'name') ??
        getErrorMessage(error, 'Unable to create the organization.');
      setCreateOrgError(message);
      toast.error(message);
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const onDeleteOrg = async (id: string) => {
    await deleteOrganization(id);
    await refreshOrgs();
  };

  const onCheckUrls = async (id: string): Promise<boolean> => {
    return await hasAssociatedUrls(id);
  };

  const handleDeleteClick = async (orgId: string) => {
    try {
      const res = await onCheckUrls(orgId);
      if (res) {
        setShowAssociatedUrlsAlert(true);
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error, 'Failed to search for associated URLs.'),
      );
    }
    setDeleteConfirmOrgId(orgId);
  };

  const handleDeleteConfirm = async () => {
    const orgId = deleteConfirmOrgId;
    if (!orgId) return;
    try {
      await onDeleteOrg(orgId);
      toast.success('Organization deleted successfully');
      setShowAssociatedUrlsAlert(false);
      setDeleteConfirmOrgId(null);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete organization.'));
    }
  };

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalOrgs / query.pagination.limit));

  return (
    <TooltipProvider>
      <div className="min-h-[calc(100dvh-var(--app-header-height,0px))] space-y-5 bg-background pb-7">
        <div className="flex items-center justify-between">
          <h1 className="m-0 text-4xl leading-none font-bold tracking-normal text-foreground">
            <span className="inline bg-background text-foreground">
              My Organizations
            </span>
          </h1>
          <div className="hidden lg:block">
            {mayCreateOrg && (
              <Button
                className="h-9 bg-primary px-4 font-semibold text-primary-foreground shadow-none hover:bg-primary/90"
                aria-label="Create organization"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <PlusCircleIcon />
                Create
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {mayCreateOrg && (
            <Button
              size="icon"
              aria-label="Create organization"
              className="bg-primary text-primary-foreground shadow-none hover:bg-primary/90"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <PlusCircleIcon />
            </Button>
          )}
          <Button
            size="icon"
            aria-label="Open organization filters"
            variant="outline"
            className={organizationControlBorderClass}
            onClick={() => setMobileFiltersOpen(true)}
          >
            <FilterIcon />
          </Button>
          <div className="flex flex-1">
            <Input
              aria-label="Search organizations"
              placeholder="Search organizations..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSearch();
              }}
              className={`rounded-r-none ${organizationInputClass}`}
            />
            <Button
              variant="outline"
              aria-label="Search organizations"
              className={`rounded-l-none border-l-0 px-3 ${organizationControlBorderClass}`}
              onClick={onSearch}
            >
              <SearchIcon />
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="hidden w-[22.75rem] shrink-0 lg:block">
            <div className="sticky top-[calc(var(--app-header-height,80px)+1.75rem)] max-h-[calc(100dvh-var(--app-header-height,80px)-3.5rem)] overflow-hidden">
              <div className="mb-3 flex">
                <Input
                  id="organizations-search"
                  aria-label="Search organizations"
                  placeholder="Search organizations..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSearch();
                  }}
                  className={`h-9 rounded-r-none ${organizationInputClass}`}
                />
                <Button
                  id="organizations-search-submit"
                  variant="outline"
                  className={`h-9 w-12 rounded-l-none border-l-0 px-0 ${organizationControlBorderClass}`}
                  onClick={onSearch}
                  aria-label="Search organizations"
                >
                  <SearchIcon />
                </Button>
              </div>
              <FilterForm
                query={query}
                setQuery={setQuery}
                onSearch={onSearch}
                isAdmin={isAdmin}
                memberNetidError={memberNetidError}
                setMemberNetidError={setMemberNetidError}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {orgLoadError && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Unable to load organizations</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-3">
                  <span>{orgLoadError}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void refreshOrgs()}
                  >
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {showAssociatedUrlsAlert && (
              <Alert className="mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <AlertTitle>
                      Warning! Links found to be associated with organization
                    </AlertTitle>
                    <AlertDescription>
                      Deleting this organization may affect linked resources.
                    </AlertDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAssociatedUrlsAlert(false)}
                  >
                    Dismiss
                  </Button>
                </div>
              </Alert>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="h-16 border-r border-border px-5 text-base font-bold text-foreground">
                      Name
                    </TableHead>
                    <TableHead className="h-16 border-r border-border px-5 text-base font-bold text-foreground">
                      Role
                    </TableHead>
                    {lastActiveColumn === 'timeCreated' && (
                      <TableHead className="h-16 border-r border-border px-5 text-base font-bold text-foreground">
                        Time Created
                      </TableHead>
                    )}
                    {lastActiveColumn === 'memberCount' && (
                      <TableHead className="h-16 border-r border-border px-5 text-base font-bold text-foreground">
                        Members
                      </TableHead>
                    )}
                    {lastActiveColumn === 'dateAdded' && (
                      <TableHead className="h-16 border-r border-border px-5 text-base font-bold text-foreground">
                        Date Added
                      </TableHead>
                    )}
                    <TableHead className="h-16 px-5 text-right text-base font-bold text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs === null ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="h-[74px] border-border">
                        <TableCell className="px-5">
                          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                        </TableCell>
                        <TableCell className="px-5">
                          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                        </TableCell>
                        <TableCell className="px-5">
                          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                        </TableCell>
                        <TableCell className="px-5 text-right">
                          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : orgs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No organizations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orgs.map((org) => (
                      <TableRow
                        key={org.id}
                        className="h-[74px] border-border hover:bg-muted/30"
                      >
                        <TableCell className="px-5 text-base font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{org.name}</span>
                            {org.deleted && (
                              <Badge variant="destructive">Deleted</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-5 text-base font-semibold text-foreground/85">
                          {org.role ? orgRoleFormat[org.role] : 'None'}
                        </TableCell>
                        {lastActiveColumn === 'timeCreated' && (
                          <TableCell className="px-5 text-base font-semibold text-foreground/85">
                            {org.timeCreated
                              ? dayjs(org.timeCreated).format('MMM D, YYYY')
                              : '-'}
                          </TableCell>
                        )}
                        {lastActiveColumn === 'memberCount' && (
                          <TableCell className="px-5 text-base font-semibold text-foreground/85">
                            {org.memberCount || 0}
                          </TableCell>
                        )}
                        {lastActiveColumn === 'dateAdded' && (
                          <TableCell className="px-5 text-base font-semibold text-foreground/85">
                            {org.dateAdded
                              ? dayjs(org.dateAdded).format('MMM D, YYYY')
                              : '-'}
                          </TableCell>
                        )}
                        <TableCell className="px-5 text-right">
                          <div className="flex justify-end gap-4">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  aria-label={`View ${org.name}`}
                                  to={`/app/orgs/${org.id}`}
                                  className="flex h-8 w-8 items-center justify-center text-foreground/80 hover:text-foreground"
                                >
                                  <EyeIcon className="size-4" />
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent>View</TooltipContent>
                            </Tooltip>
                            {isAdmin && (
                              <AlertDialog
                                open={deleteConfirmOrgId === org.id}
                                onOpenChange={(open) => {
                                  if (!open) setDeleteConfirmOrgId(null);
                                }}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Delete ${org.name}`}
                                  className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                                  disabled={org.deleted}
                                  onClick={() => handleDeleteClick(org.id)}
                                >
                                  <TrashIcon className="size-4" />
                                </Button>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Are you sure you want to delete this
                                      organization?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>No</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleDeleteConfirm}
                                    >
                                      Yes
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-5 flex items-center justify-center gap-5">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Previous page"
                className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-foreground disabled:opacity-35"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <select
                aria-label="Current page"
                className="h-9 w-9 appearance-none rounded-md border border-primary bg-background text-center text-sm font-semibold text-foreground outline-none"
                value={currentPage}
                onChange={(e) => setPage(Number(e.target.value))}
              >
                {Array.from({ length: totalPages }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Next page"
                className="h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-foreground disabled:opacity-35"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
              <select
                aria-label="Organizations per page"
                className="h-9 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none"
                value={query.pagination.limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setQuery((prev) => ({
                    ...prev,
                    pagination: { ...prev.pagination, limit: newLimit },
                  }));
                  setCurrentPage(1);
                }}
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterForm
                query={query}
                setQuery={setQuery}
                onSearch={onSearch}
                isAdmin={isAdmin}
                memberNetidError={memberNetidError}
                setMemberNetidError={setMemberNetidError}
              />
            </div>
          </SheetContent>
        </Sheet>

        <Dialog
          open={isCreateModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateModalOpen(false);
              setNewOrgName('');
              setCreateOrgError(null);
            }
          }}
        >
          <DialogContent className="max-w-[38rem] gap-5 rounded-md border-border bg-muted px-7 pt-6 pb-6 text-foreground shadow-none">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="text-xl font-bold">
                Create Organization
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="org-name" className={organizationLabelClass}>
                  Organization Name
                </Label>
                <Input
                  id="org-name"
                  placeholder="Enter organization name..."
                  aria-invalid={createOrgError !== null}
                  aria-describedby={
                    createOrgError ? 'org-name-error' : undefined
                  }
                  className={`h-9 ${organizationInputClass} ${
                    createOrgError
                      ? 'border-destructive focus-visible:ring-destructive'
                      : ''
                  }`}
                  value={newOrgName}
                  onChange={(e) => {
                    setNewOrgName(e.target.value);
                    setCreateOrgError(null);
                  }}
                />
                {createOrgError && (
                  <p
                    id="org-name-error"
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {createOrgError}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-end sm:space-x-0">
              <Button
                variant="outline"
                className={`h-9 px-5 ${organizationControlBorderClass}`}
                disabled={isCreatingOrg}
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewOrgName('');
                  setCreateOrgError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="h-9 bg-primary px-5 font-semibold text-primary-foreground shadow-none hover:bg-primary/90"
                disabled={isCreatingOrg || !newOrgName.trim()}
                onClick={onCreate}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
