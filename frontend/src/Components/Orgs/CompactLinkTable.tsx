import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  EditIcon,
  EyeIcon,
  FilterIcon,
  QrCodeIcon,
  Trash2Icon,
  Copy,
  UsersIcon,
  UserPlusIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { OrganizationLink } from '@/Interfaces/Organizations';
import { LinkSharedWith } from '@/Interfaces/Link';
import { getOrganizationLinks } from '@/Api/Organization';
import { getLinkFromAlias } from '@/Lib/Utils';
import BulkLinkActions from '@/Components/BulkLinkActions';
import PaginationControls from '@/Components/PaginationControls';
import BulkTransferModal from '@/Modals/BulkTransferModal';
import { deleteLink, transferLink } from '@/Api/Links';
import { useLinkSelection } from '@/Hooks/useLinkSelection';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/Components/ui/alert-dialog';
import OrganizationSearch, {
  DEFAULT_ORGANIZATION_LINK_QUERY,
  OrganizationLinkFilters,
  OrganizationLinkSearchQuery,
} from '@/Components/Orgs/OrganizationSearch';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/Components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/Components/ui/tooltip';

interface CompactLinkTableProps {
  org_id: string;
  userNetid: string;
  forceRefresh: boolean;
  isAdmin?: boolean;
  canCreate: boolean;
}

const CompactLinkTable = ({
  org_id,
  userNetid,
  forceRefresh,
  isAdmin,
  canCreate,
}: CompactLinkTableProps) => {
  const [links, setLinks] = useState<OrganizationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<OrganizationLinkSearchQuery>(
    DEFAULT_ORGANIZATION_LINK_QUERY,
  );
  const [searchFilters, setSearchFilters] = useState<OrganizationLinkFilters>({
    title: '',
    alias: '',
    owner: '',
    url: '',
  });

  const fetchLinks = async () => {
    const resp = await getOrganizationLinks(org_id);
    setLinks(resp);
    setLoading(false);
  };

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org_id, forceRefresh]);

  const transferLinkOwnership = async (owner: LinkSharedWith) => {
    try {
      await transferLink(selectedLinkId, owner);
      toast.success('Link ownership transferred successfully');
    } catch {
      toast.error('Error transferring link ownership');
    }
    setTransferModalVisible(false);
    setLoading(true);
    await fetchLinks();
  };

  const visibleLinks = useMemo(() => {
    const normalize = (value: string | undefined) =>
      (value ?? '').trim().toLocaleLowerCase();
    const textMatches = (value: string | undefined, search: string) =>
      normalize(value).includes(normalize(search));

    const filtered = links.filter((link) => {
      const createdTime = dayjs(link.created_time);
      const owner = link.owner.org_name ?? link.owner._id;
      const matchesType =
        searchQuery.showType === 'tracking_pixels'
          ? link.is_tracking_pixel_link
          : !link.is_tracking_pixel_link;

      return (
        textMatches(link.title, searchQuery.title) &&
        textMatches(link.alias, searchQuery.alias) &&
        textMatches(link.long_url, searchQuery.url) &&
        textMatches(owner, searchQuery.owner) &&
        searchQuery.roles.includes(link.role) &&
        (searchQuery.showExpiredLinks || !link.is_expired) &&
        (isAdmin === true && searchQuery.showDeletedLinks
          ? true
          : !link.deleted) &&
        matchesType &&
        (!searchQuery.beginTime ||
          !createdTime.isBefore(searchQuery.beginTime)) &&
        (!searchQuery.endTime || !createdTime.isAfter(searchQuery.endTime))
      );
    });

    if (searchQuery.sort.key === 'relevance') return filtered;

    const direction = searchQuery.sort.order === 'ascending' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (searchQuery.sort.key) {
        case 'created_time':
          return (
            direction *
            (dayjs(a.created_time).valueOf() - dayjs(b.created_time).valueOf())
          );
        case 'title':
          return direction * a.title.localeCompare(b.title);
        case 'visits':
          return direction * ((a.visits ?? 0) - (b.visits ?? 0));
        default:
          return 0;
      }
    });
  }, [isAdmin, links, searchQuery]);

  const totalPages = Math.ceil(visibleLinks.length / pageSize);
  const paginatedLinks = useMemo(
    () =>
      visibleLinks.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, pageSize, visibleLinks],
  );
  const {
    selectedItems: selectedLinks,
    selectedIds: selectedLinkIds,
    visibleSelectedCount,
    allVisibleSelected: allPageLinksSelected,
    someVisibleSelected: somePageLinksSelected,
    setItemSelected: setLinkSelected,
    toggleVisibleSelection: togglePageSelection,
    clearSelection,
  } = useLinkSelection(paginatedLinks);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, searchQuery]);

  const shareDisabled = selectedLinks.some((link) => !link.canEdit);
  const deleteDisabled = selectedLinks.some((link) => link.canDelete !== true);
  const transferDisabled = selectedLinks.some(
    (link) => link.canTransfer !== true,
  );

  const refreshAfterBulkAction = async () => {
    setLoading(true);
    try {
      await fetchLinks();
    } catch {
      setLoading(false);
      toast.error('Failed to refresh links');
    }
  };

  const handleDelete = async (_id: string) => {
    try {
      await deleteLink(_id);
      toast.success('Link deleted successfully');
      await refreshAfterBulkAction();
    } catch {
      toast.error('Failed to delete link');
    }
  };

  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <Button
          variant="outline"
          aria-label="Open organization link filters"
          className="border-border bg-background shadow-none"
          onClick={() => setMobileFiltersOpen(true)}
        >
          <FilterIcon />
          Filter
        </Button>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(20rem,390px)_minmax(0,1fr)] lg:items-start">
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-0 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
            <OrganizationSearch
              isAdmin={isAdmin}
              query={searchQuery}
              setQuery={setSearchQuery}
              filters={searchFilters}
              setFilters={setSearchFilters}
            />
          </div>
        </aside>
        <div className="min-w-0">
          <TooltipProvider>
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border bg-card">
                <Table>
                  <TableHeader className="bg-muted dark:bg-[#2a2a2a]">
                    <TableRow className="border-b border-border hover:bg-transparent dark:border-white/10">
                      <TableHead className="w-12">
                        <Checkbox
                          aria-label="Select all links on this page"
                          checked={
                            allPageLinksSelected
                              ? true
                              : somePageLinksSelected
                                ? 'indeterminate'
                                : false
                          }
                          onCheckedChange={(value) => {
                            togglePageSelection(value === true);
                          }}
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Alias</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Deleted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-muted-foreground dark:text-[#9d9d9d]"
                        >
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : paginatedLinks.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-muted-foreground dark:text-[#9d9d9d]"
                        >
                          No links found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLinks.map((link) => (
                        <TableRow key={link._id}>
                          <TableCell>
                            <Checkbox
                              aria-label={`Select ${link.title}`}
                              checked={selectedLinks.some(
                                (selected) => selected._id === link._id,
                              )}
                              onCheckedChange={(value) => {
                                setLinkSelected(link, value === true);
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-semibold">
                            {link.title}
                          </TableCell>
                          <TableCell>{link.alias}</TableCell>
                          <TableCell>{link.owner.org_name}</TableCell>
                          <TableCell className="capitalize">
                            {link.role}
                          </TableCell>
                          <TableCell>{link.deleted ? 'Yes' : 'No'}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" asChild>
                                    <a
                                      aria-label={`View ${link.title}`}
                                      href={`/app/links/${link._id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <EyeIcon className="text-black dark:text-white" />
                                    </a>
                                  </Button>
                                </TooltipTrigger>

                                <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                                  View link details
                                </TooltipContent>
                              </Tooltip>
                              {!link.deleted && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Copy ${link.title}`}
                                        onClick={() => {
                                          navigator.clipboard.writeText(
                                            getLinkFromAlias(
                                              link.alias,
                                              link.is_tracking_pixel_link,
                                            ),
                                          );
                                          toast.success(
                                            'Link copied to clipboard',
                                          );
                                        }}
                                      >
                                        <Copy className="text-black dark:text-white" />
                                      </Button>
                                    </TooltipTrigger>

                                    <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                                      Copy link
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                      >
                                        <a
                                          aria-label={`Open QR code for ${link.title}`}
                                          href={`/app/links/${link._id}?mode=qrcode`}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <QrCodeIcon className="text-black dark:text-white" />
                                        </a>
                                      </Button>
                                    </TooltipTrigger>

                                    <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                                      Access QR code
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                              {link.canEdit && (
                                <>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                      >
                                        <a
                                          aria-label={`Edit ${link.title}`}
                                          href={`/app/links/${link._id}?mode=edit`}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <EditIcon className="text-black dark:text-white" />
                                        </a>
                                      </Button>
                                    </TooltipTrigger>

                                    <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                                      Edit link
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        asChild
                                      >
                                        <a
                                          aria-label={`Share ${link.title}`}
                                          href={`/app/links/${link._id}?mode=collaborate`}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <UsersIcon className="text-black dark:text-white" />
                                        </a>
                                      </Button>
                                    </TooltipTrigger>

                                    <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                                      Share link permissions
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                              {link.owner._id === org_id &&
                                !link.deleted &&
                                isAdmin && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Transfer ${link.title}`}
                                        onClick={() => {
                                          setTransferModalVisible(true);
                                          setSelectedLinkId(link._id);
                                        }}
                                      >
                                        <UserPlusIcon className="text-black dark:text-white" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                                      Transfer ownership
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              {isAdmin && (
                                <AlertDialog>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex">
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Delete ${link.title}`}
                                            disabled={
                                              link.owner._id !== org_id ||
                                              link.deleted
                                            }
                                          >
                                            <Trash2Icon />
                                          </Button>
                                        </AlertDialogTrigger>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                                      {link.deleted
                                        ? 'Link is deleted'
                                        : link.owner._id !== org_id
                                          ? 'Only the owning organization can delete this link'
                                          : 'Delete link'}
                                    </TooltipContent>
                                  </Tooltip>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Are you sure you want to delete this
                                        link?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>No</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(link._id)}
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
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                label="organization links"
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </div>
            <BulkTransferModal
              visible={transferModalVisible}
              selectedCount={1}
              allowOrganizations={false}
              onCancel={() => {
                setTransferModalVisible(false);
                setSelectedLinkId('');
              }}
              onOk={transferLinkOwnership}
            />
            <BulkLinkActions
              selectedIds={selectedLinkIds}
              actorId={userNetid}
              canCreate={canCreate}
              shareDisabled={shareDisabled}
              transferDisabled={transferDisabled}
              deleteDisabled={deleteDisabled}
              allVisibleSelected={allPageLinksSelected}
              someVisibleSelected={somePageLinksSelected}
              onToggleVisible={togglePageSelection}
              visibleSelectedCount={visibleSelectedCount}
              totalVisible={paginatedLinks.length}
              onClear={clearSelection}
              onRefresh={refreshAfterBulkAction}
            />
          </TooltipProvider>
        </div>
      </div>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent
          side="left"
          className="w-[min(90vw,390px)] overflow-y-auto bg-background sm:max-w-[390px]"
        >
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <OrganizationSearch
            isAdmin={isAdmin}
            query={searchQuery}
            setQuery={setSearchQuery}
            filters={searchFilters}
            setFilters={setSearchFilters}
            className="mt-6"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CompactLinkTable;
