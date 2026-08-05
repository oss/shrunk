import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
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
import { OrganizationLink } from '@/interfaces/organizations';
import { LinkSharedWith } from '@/interfaces/link';
import { getOrganizationLinks } from '@/api/organization';
import { getLinkFromAlias } from '@/lib/utils';
import MultiLinkSelectPopup from '@/components/MultiLinkSelectPopup';
import BulkTransferModal from '@/modals/BulkTransferModal';
import CollaboratorModal, { Collaborator } from '@/modals/CollaboratorModal';
import TransferToNetIdModal from '@/modals/TransferToNetIdModal';
import {
  addCollaboratorBulk,
  deleteLinkBulk,
  transferLink,
  transferLinksBulk,
} from '@/api/links';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import OrganizationSearch, {
  DEFAULT_ORGANIZATION_LINK_QUERY,
  OrganizationLinkFilters,
  OrganizationLinkSearchQuery,
} from '@/components/orgs/OrganizationSearch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  adminIconGhostButtonClass,
  adminPaginationButtonClass,
  adminPaginationCurrentClass,
  adminPaginationWrapClass,
  adminPageSizeClass,
  adminTableCellClass,
  adminTableHeadClass,
  adminTableHeadDividerClass,
  adminTableRowClass,
  adminTableWrapperClass,
} from '@/lib/admin-styles';

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
  const [selectedLinks, setSelectedLinks] = useState<OrganizationLink[]>([]);
  const [bulkShareOpen, setBulkShareOpen] = useState(false);
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
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

  const transferLinkOwnership = async (netid: string, link_id: string) => {
    try {
      await transferLink(link_id, { type: 'netid', _id: netid });
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

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, searchQuery]);

  useEffect(() => {
    setSelectedLinks((selected) => {
      const refreshedLinks = new Map(
        paginatedLinks.map((link) => [link._id, link]),
      );
      return selected.flatMap((link) => {
        const refreshed = refreshedLinks.get(link._id);
        return refreshed ? [refreshed] : [];
      });
    });
  }, [paginatedLinks]);

  const selectedLinkIds = selectedLinks.map((link) => link._id);
  const allPageLinksSelected =
    paginatedLinks.length > 0 &&
    paginatedLinks.every((link) =>
      selectedLinks.some((selected) => selected._id === link._id),
    );
  const somePageLinksSelected =
    !allPageLinksSelected &&
    paginatedLinks.some((link) =>
      selectedLinks.some((selected) => selected._id === link._id),
    );
  const shareDisabled = selectedLinks.some((link) => !link.canEdit);
  const deleteDisabled = selectedLinks.some((link) => link.canDelete !== true);
  const transferDisabled = selectedLinks.some(
    (link) => link.canTransfer !== true,
  );

  const setLinkSelected = (link: OrganizationLink, checked: boolean) => {
    setSelectedLinks((current) => {
      if (checked) {
        if (current.some((selected) => selected._id === link._id)) {
          return current;
        }
        return [...current, link];
      }
      return current.filter((selected) => selected._id !== link._id);
    });
  };

  const togglePageSelection = (checked: boolean) => {
    setSelectedLinks(checked ? paginatedLinks : []);
  };

  const refreshAfterBulkAction = async () => {
    setLoading(true);
    try {
      await fetchLinks();
    } catch {
      setLoading(false);
      toast.error('Failed to refresh links');
    }
  };

  const handleBulkShare = async (
    activeTab: 'netid' | 'org',
    entity: Collaborator,
  ) => {
    try {
      await addCollaboratorBulk(
        selectedLinkIds,
        { _id: entity._id, type: activeTab },
        entity.role as 'editor' | 'viewer',
      );
      toast.success('Selected links shared successfully');
      setBulkShareOpen(false);
      setSelectedLinks([]);
    } catch {
      toast.error('Failed to share selected links');
    } finally {
      await refreshAfterBulkAction();
    }
  };

  const handleBulkDelete = async () => {
    try {
      await deleteLinkBulk(selectedLinkIds);
      toast.success('Selected links deleted successfully');
      setBulkDeleteOpen(false);
      setSelectedLinks([]);
    } catch {
      toast.error('Failed to delete selected links');
    } finally {
      await refreshAfterBulkAction();
    }
  };

  const handleBulkTransfer = async (owner: LinkSharedWith) => {
    try {
      await transferLinksBulk(selectedLinkIds, owner);
      toast.success('Selected links transferred successfully');
      setBulkTransferOpen(false);
      setSelectedLinks([]);
    } catch {
      toast.error('Failed to transfer selected links');
    } finally {
      await refreshAfterBulkAction();
    }
  };

  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <Button
          variant="outline"
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
              <div className={adminTableWrapperClass}>
                <Table>
                  <TableHeader className="bg-muted dark:bg-[#2a2a2a]">
                    <TableRow className="border-b border-border hover:bg-transparent dark:border-white/10">
                      <TableHead
                        className={`${adminTableHeadClass} w-12 ${adminTableHeadDividerClass}`}
                      >
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
                      <TableHead
                        className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                      >
                        Title
                      </TableHead>
                      <TableHead
                        className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                      >
                        Alias
                      </TableHead>
                      <TableHead
                        className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                      >
                        Owner
                      </TableHead>
                      <TableHead
                        className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                      >
                        Role
                      </TableHead>
                      <TableHead
                        className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                      >
                        Deleted
                      </TableHead>
                      <TableHead
                        className={`${adminTableHeadClass} text-right`}
                      >
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow className={adminTableRowClass}>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-muted-foreground dark:text-[#9d9d9d]"
                        >
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : paginatedLinks.length === 0 ? (
                      <TableRow className={adminTableRowClass}>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-muted-foreground dark:text-[#9d9d9d]"
                        >
                          No links found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedLinks.map((link) => (
                        <TableRow key={link._id} className={adminTableRowClass}>
                          <TableCell className={adminTableCellClass}>
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
                          <TableCell
                            className={`${adminTableCellClass} font-semibold text-foreground dark:text-[#f1f1f1]`}
                          >
                            {link.title}
                          </TableCell>
                          <TableCell className={adminTableCellClass}>
                            {link.alias}
                          </TableCell>
                          <TableCell className={adminTableCellClass}>
                            {link.owner.org_name}
                          </TableCell>
                          <TableCell
                            className={`${adminTableCellClass} capitalize`}
                          >
                            {link.role}
                          </TableCell>
                          <TableCell className={adminTableCellClass}>
                            {link.deleted ? 'Yes' : 'No'}
                          </TableCell>
                          <TableCell className={adminTableCellClass}>
                            <div className="flex justify-end gap-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className={adminIconGhostButtonClass}
                                    asChild
                                  >
                                    <a
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
                                        className={adminIconGhostButtonClass}
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
                                        className={adminIconGhostButtonClass}
                                        asChild
                                      >
                                        <a
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
                                        className={adminIconGhostButtonClass}
                                        asChild
                                      >
                                        <a
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
                                        className={adminIconGhostButtonClass}
                                        asChild
                                      >
                                        <a
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
                                        className={adminIconGhostButtonClass}
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={adminIconGhostButtonClass}
                                      asChild
                                      disabled={
                                        link.owner._id !== org_id ||
                                        link.deleted
                                      }
                                    >
                                      <a
                                        href={`/app/links/${link._id}?mode=edit`}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        <Trash2Icon />
                                      </a>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black text-white dark:bg-white dark:text-black">
                                    {link.deleted
                                      ? 'Link is deleted'
                                      : 'Delete link'}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className={adminPaginationWrapClass}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={adminPaginationButtonClass}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <span className={adminPaginationCurrentClass}>
                  {currentPage}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={adminPaginationButtonClass}
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
                <div className="ml-3 flex items-center gap-2">
                  <select
                    className={adminPageSizeClass}
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    {[5, 10, 20, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <span>/ page</span>
                </div>
              </div>
            </div>
            <TransferToNetIdModal
              visible={transferModalVisible}
              onCancel={() => {
                setTransferModalVisible(false);
                setSelectedLinkId('');
              }}
              onOk={transferLinkOwnership}
              link_id={selectedLinkId}
            />
            <MultiLinkSelectPopup
              selectedCount={selectedLinks.length}
              onClear={() => setSelectedLinks([])}
              onShare={{
                disabled: shareDisabled,
                disabledReason: 'Only links you can edit can be shared.',
                onClick: () => setBulkShareOpen(true),
              }}
              onTransfer={{
                disabled: transferDisabled,
                disabledReason: 'Only links you own can be transferred.',
                onClick: () => setBulkTransferOpen(true),
              }}
              onDelete={{
                disabled: deleteDisabled,
                disabledReason: 'Only links you own can be deleted.',
                onClick: () => setBulkDeleteOpen(true),
              }}
              allVisibleSelected={allPageLinksSelected}
              someVisibleSelected={somePageLinksSelected}
              toggleVisibleSelection={togglePageSelection}
              visibleCheckedCount={selectedLinks.length}
              totalLinks={paginatedLinks.length}
            />
            <CollaboratorModal
              canCreate={canCreate}
              _id={userNetid}
              visible={bulkShareOpen}
              people={[]}
              roles={[
                { value: 'editor', label: 'Editor' },
                { value: 'viewer', label: 'Viewer' },
              ]}
              onAddEntity={handleBulkShare}
              onChangeEntity={() => {}}
              onRemoveEntity={() => {}}
              onOk={() => setBulkShareOpen(false)}
              onCancel={() => setBulkShareOpen(false)}
              multipleMasters
            />
            <BulkTransferModal
              visible={bulkTransferOpen}
              selectedCount={selectedLinks.length}
              onOk={handleBulkTransfer}
              onCancel={() => setBulkTransferOpen(false)}
            />
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete selected links?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete {selectedLinks.length}{' '}
                    {selectedLinks.length === 1 ? 'link' : 'links'}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleBulkDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
