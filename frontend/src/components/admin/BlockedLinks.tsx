import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudDownloadIcon,
  PlusCircleIcon,
  SearchIcon,
  TrashIcon,
} from 'lucide-react';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { blockLink, getBlockedLinks, unBlockLink } from '@/api/app';
import { GrantedBy } from '@/interfaces/csv';
import useFuzzySearch from '@/lib/hooks/useFuzzySearch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  adminDialogContentClass,
  adminDialogLabelClass,
  adminIconGhostButtonClass,
  adminInputClass,
  adminOutlineButtonClass,
  adminPaginationButtonClass,
  adminPaginationCurrentClass,
  adminPaginationWrapClass,
  adminPageSizeClass,
  adminPrimaryButtonClass,
  adminSearchIconClass,
  adminTableCellClass,
  adminTableHeadClass,
  adminTableHeadDividerClass,
  adminTableRowClass,
  adminTableWrapperClass,
  adminTextareaClass,
} from '@/lib/admin-styles';

const renderURLs = (url: string): JSX.Element => (
  <div className="flex items-center gap-4">
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[0.7rem] text-muted-foreground dark:border-white/20 dark:text-[#bcbcbc]">
      +
    </span>
    <a
      key={url}
      href={url}
      className="text-primary hover:text-primary/80 dark:text-[#ff2634] dark:hover:text-[#ff5360]"
    >
      {url}
    </a>
  </div>
);

interface BlockedLink {
  url: string;
  blockedBy: string;
  timeBlocked: string;
  comment: string;
}

interface SearchBannedLinksProps {
  onSearch: (value: string) => void;
}

const SearchBannedLinks: React.FC<SearchBannedLinksProps> = ({ onSearch }) => {
  const [value, setValue] = useState('');

  const handleSearch = useCallback(
    (searchValue: string) => {
      setValue(searchValue);
      if (!searchValue) {
        onSearch('');
        return;
      }
      onSearch(searchValue);
    },
    [onSearch],
  );

  return (
    <div className="relative w-full min-w-0">
      <SearchIcon
        className={`absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 ${adminSearchIconClass}`}
      />
      <Input
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search by URL or NetID"
        className={`pl-9 ${adminInputClass}`}
      />
      {value && (
        <button
          type="button"
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground dark:text-[#8f8f8f] dark:hover:text-[#efefef]"
          onClick={() => handleSearch('')}
        >
          ×
        </button>
      )}
    </div>
  );
};

const BlockedLinks = () => {
  const [loading, setLoading] = useState(true);
  const [blockedLinks, setBlockedLinks] = useState<BlockedLink[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refetchBlockedLinks, setRefetchBlockedLinks] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [showBlockLinkModal, setShowBlockLinkModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [newLink, setNewLink] = useState('');
  const [newComment, setNewComment] = useState('');

  const rehydrateData = (): void => {
    setRefetchBlockedLinks((prev) => !prev);
  };

  const { search } = useFuzzySearch(blockedLinks, {
    keys: ['url', 'blockedBy'],
    threshold: 0.3,
    distance: 100,
  });

  const filteredLinks = useMemo(() => {
    if (!searchQuery) return blockedLinks;
    return search(searchQuery).map((result) => result.item);
  }, [search, searchQuery, blockedLinks]);

  const totalPages = Math.ceil(filteredLinks.length / pageSize);
  const paginatedLinks = filteredLinks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const handleUnblock = async (url: string) => {
    try {
      await unBlockLink(url);
      toast.success('Link unblocked successfully');
      rehydrateData();
    } catch (error) {
      toast.error(`Failed to unblock link: ${error}`);
    }
  };

  const columns = [
    {
      title: 'URL',
      dataIndex: 'url' as const,
      key: 'url',
      render: renderURLs,
    },
    {
      title: 'Blocked By',
      dataIndex: 'blockedBy' as const,
      key: 'blockedBy',
    },
    {
      title: 'Time Blocked',
      key: 'timeBlocked',
      dataIndex: 'timeBlocked' as const,
      render: (_: any, record: BlockedLink) => (
        <span>{dayjs(record.timeBlocked).format('MMM D, YYYY - h:mm A')}</span>
      ),
    },
    {
      title: () => <div className="text-right">Actions</div>,
      key: 'actions',
      render: (_: any, record: BlockedLink) => (
        <div className="flex justify-end">
          <TooltipProvider>
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={adminIconGhostButtonClass}
                    >
                      <TrashIcon />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Unblock</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Are you sure you want to unblock this link?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will allow access to {record.url}.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleUnblock(record.url)}>
                    Yes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  const exportAsCSV = useCallback(() => {
    const csvContent = [
      ['URL', 'Blocked By', 'Time Blocked', 'Comment'].join(','),
      ...blockedLinks.map((link) =>
        [
          `"${link.url}"`,
          link.blockedBy,
          link.timeBlocked,
          `"${link.comment}"`,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `blocked_links_export_${new Date().toISOString()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [blockedLinks]);

  useEffect(() => {
    const updateBlockedLinks = async (): Promise<void> => {
      const result = await getBlockedLinks();
      setBlockedLinks(
        result.entities.map((entity: GrantedBy) => ({
          url: entity.entity,
          comment: entity.comment ?? '',
          blockedBy: entity.granted_by ?? '',
          timeBlocked: entity.time_granted ?? dayjs.unix(0).format(),
        })),
      );
    };

    Promise.all([updateBlockedLinks()]).then(() => setLoading(false));
  }, [refetchBlockedLinks]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  const handleConfirm = async () => {
    if (!newLink.trim()) {
      toast.error('Please enter a link to block');
      return;
    }
    if (!newComment.trim()) {
      toast.error('Please provide a reason for blocking this link');
      return;
    }

    setModalLoading(true);
    try {
      await blockLink(newLink, newComment);
      toast.success('Link blocked successfully');
      setNewLink('');
      setNewComment('');
      setShowBlockLinkModal(false);
      rehydrateData();
    } catch {
      toast.error('Failed to block link');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:w-auto">
            <SearchBannedLinks onSearch={handleSearch} />
          </div>
          <div className="flex w-full justify-between gap-2 lg:w-auto">
            <Button
              variant="outline"
              className={adminOutlineButtonClass}
              onClick={exportAsCSV}
            >
              <CloudDownloadIcon />
              Export
            </Button>
            <Button
              className={adminPrimaryButtonClass}
              onClick={() => setShowBlockLinkModal(true)}
            >
              <PlusCircleIcon />
              Block Link
            </Button>
          </div>
        </div>

        <div className={adminTableWrapperClass}>
          <Table>
            <TableHeader className="bg-muted dark:bg-[#2a2a2a]">
              <TableRow className="border-b border-border hover:bg-transparent dark:border-white/10">
                <TableHead
                  className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                >
                  URL
                </TableHead>
                <TableHead
                  className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                >
                  Blocked By
                </TableHead>
                <TableHead
                  className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                >
                  Time Blocked
                </TableHead>
                <TableHead className={`${adminTableHeadClass} text-right`}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className={adminTableRowClass}>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground dark:text-[#9d9d9d]"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedLinks.length === 0 ? (
                <TableRow className={adminTableRowClass}>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground dark:text-[#9d9d9d]"
                  >
                    No blocked links found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLinks.map((record) => (
                  <TableRow key={record.url} className={adminTableRowClass}>
                    <TableCell className={`${adminTableCellClass} font-medium`}>
                      {(columns[0].render as (url: string) => React.ReactNode)(
                        record.url,
                      )}
                    </TableCell>
                    <TableCell className={adminTableCellClass}>
                      {record.blockedBy}
                    </TableCell>
                    <TableCell className={adminTableCellClass}>
                      {(
                        columns[2].render as (
                          _: any,
                          record: BlockedLink,
                        ) => React.ReactNode
                      )(record.timeBlocked, record)}
                    </TableCell>
                    <TableCell className={adminTableCellClass}>
                      {(
                        columns[3].render as (
                          _: any,
                          record: BlockedLink,
                        ) => React.ReactNode
                      )(null, record)}
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
          <span className={adminPaginationCurrentClass}>{currentPage}</span>
          <Button
            variant="ghost"
            size="icon"
            className={adminPaginationButtonClass}
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      <Dialog
        open={showBlockLinkModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowBlockLinkModal(false);
            setNewLink('');
            setNewComment('');
          }
        }}
      >
        <DialogContent className={adminDialogContentClass}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground dark:text-[#efefef]">
              Block Link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="block-link-url" className={adminDialogLabelClass}>
                Link
              </Label>
              <Input
                id="block-link-url"
                placeholder="https://example.com"
                value={newLink}
                className={adminInputClass}
                onChange={(e) => setNewLink(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="block-link-comment"
                className={adminDialogLabelClass}
              >
                Comment
              </Label>
              <Textarea
                id="block-link-comment"
                placeholder="Why is this link being blocked?"
                rows={4}
                value={newComment}
                className={adminTextareaClass}
                onChange={(e) => setNewComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className={adminOutlineButtonClass}
              onClick={() => {
                setShowBlockLinkModal(false);
                setNewLink('');
                setNewComment('');
              }}
            >
              Cancel
            </Button>
            <Button
              className={adminPrimaryButtonClass}
              onClick={handleConfirm}
              disabled={modalLoading}
            >
              {modalLoading ? 'Blocking...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default BlockedLinks;
