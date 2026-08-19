import {
  CloudDownloadIcon,
  PlusCircleIcon,
  SearchIcon,
  TrashIcon,
} from 'lucide-react';
import dayjs from 'dayjs';
import { downloadCsv, toCsv } from '@/Lib/Utils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { blockLink, getBlockedLinks, unBlockLink } from '@/Api/App';
import { GrantedBy } from '@/Interfaces/Csv';
import useFuzzySearch from '@/Lib/Hooks/useFuzzySearch';
import { Button } from '@/Components/ui/button';
import PaginationControls from '@/Components/PaginationControls';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
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
} from '@/Components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/Components/ui/dialog';

const renderURLs = (url: string): React.JSX.Element => (
  <div className="flex items-center gap-4">
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[0.7rem] text-muted-foreground dark:border-white/20 dark:text-[#bcbcbc]">
      +
    </span>
    <a
      key={url}
      href={url}
      className="text-primary underline decoration-primary underline-offset-2 hover:text-primary/80 dark:text-foreground dark:hover:text-foreground"
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

function UnblockLinkButton({
  url,
  onConfirm,
}: {
  url: string;
  onConfirm: () => void;
}) {
  return (
    <div className="flex justify-end">
      <AlertDialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Unblock ${url}`}>
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
              This will allow access to {url}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
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
      <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label="Search blocked links"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search by URL or NetID"
        className="pl-9"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear blocked links search"
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

  const exportAsCSV = useCallback(() => {
    const csv = toCsv([
      ['URL', 'Blocked By', 'Time Blocked', 'Comment'],
      ...blockedLinks.map((link) => [
        link.url,
        link.blockedBy,
        link.timeBlocked,
        link.comment,
      ]),
    ]);
    downloadCsv(`blocked_links_export_${new Date().toISOString()}.csv`, csv);
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
            <Button variant="outline" onClick={exportAsCSV}>
              <CloudDownloadIcon />
              Export
            </Button>
            <Button
              aria-label="Block link"
              onClick={() => setShowBlockLinkModal(true)}
            >
              <PlusCircleIcon />
              Block Link
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader className="bg-muted dark:bg-[#2a2a2a]">
              <TableRow className="border-b border-border hover:bg-transparent dark:border-white/10">
                <TableHead>URL</TableHead>
                <TableHead>Blocked By</TableHead>
                <TableHead>Time Blocked</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground dark:text-[#9d9d9d]"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedLinks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground dark:text-[#9d9d9d]"
                  >
                    No blocked links found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLinks.map((record) => (
                  <TableRow key={record.url}>
                    <TableCell className="font-medium">
                      {renderURLs(record.url)}
                    </TableCell>
                    <TableCell>{record.blockedBy}</TableCell>
                    <TableCell>
                      {dayjs(record.timeBlocked).format('MMM D, YYYY - h:mm A')}
                    </TableCell>
                    <TableCell>
                      <UnblockLinkButton
                        url={record.url}
                        onConfirm={() => handleUnblock(record.url)}
                      />
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
          label="blocked links"
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground dark:text-[#efefef]">
              Block Link
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="block-link-url">Link</Label>
              <Input
                id="block-link-url"
                placeholder="https://example.com"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-link-comment">Comment</Label>
              <Textarea
                id="block-link-comment"
                placeholder="Why is this link being blocked?"
                rows={4}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBlockLinkModal(false);
                setNewLink('');
                setNewComment('');
              }}
            >
              Cancel
            </Button>
            <Button
              aria-label="Confirm block link"
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
