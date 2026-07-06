import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  EyeIcon,
  QrCodeIcon,
  Trash2Icon,
  Copy,
  UsersIcon,
  UserPlusIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { OrganizationLink } from '@/interfaces/organizations';
import { getOrganizationLinks } from '@/api/organization';
import { getLinkFromAlias } from '@/lib/utils';
import TransferToNetIdModal from '@/modals/TransferToNetIdModal';
import { editLink } from '@/api/links';
import { Button } from '@/components/ui/button';
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
  forceRefresh: boolean;
  isAdmin?: boolean;
}

const CompactLinkTable = ({
  org_id,
  forceRefresh,
  isAdmin,
}: CompactLinkTableProps) => {
  const [links, setLinks] = useState<OrganizationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string>('');

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
      await editLink(link_id, { owner: { type: 'netid', _id: netid } });
      toast.success('Link ownership transferred successfully');
    } catch {
      toast.error('Error transferring link ownership');
    }
    setTransferModalVisible(false);
    setLoading(true);
    await fetchLinks();
  };

  const sortLinks = (unsortedLinks: OrganizationLink[]) => {
    const roleOrder = ['owner', 'editor', 'viewer'];
    const nonDeleted = unsortedLinks.filter((link) => !link.deleted);
    const deleted = unsortedLinks.filter((link) => link.deleted);
    nonDeleted.sort(
      (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role),
    );
    deleted.sort(
      (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role),
    );
    return [...nonDeleted, ...deleted];
  };

  const sortedLinks = useMemo(() => sortLinks(links), [links]);

  const totalPages = Math.ceil(sortedLinks.length / pageSize);
  const paginatedLinks = sortedLinks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className={adminTableWrapperClass}>
          <Table>
            <TableHeader className="bg-muted dark:bg-[#2a2a2a]">
              <TableRow className="border-b border-border hover:bg-transparent dark:border-white/10">
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
                <TableHead className={`${adminTableHeadClass} text-right`}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow className={adminTableRowClass}>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground dark:text-[#9d9d9d]"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : paginatedLinks.length === 0 ? (
                <TableRow className={adminTableRowClass}>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground dark:text-[#9d9d9d]"
                  >
                    No links found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLinks.map((link) => (
                  <TableRow key={link._id} className={adminTableRowClass}>
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
                    <TableCell className={`${adminTableCellClass} capitalize`}>
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
                                    toast.success('Link copied to clipboard');
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
                                  link.owner._id !== org_id || link.deleted
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
                              {link.deleted ? 'Link is deleted' : 'Delete link'}
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
      <TransferToNetIdModal
        visible={transferModalVisible}
        onCancel={() => {
          setTransferModalVisible(false);
          setSelectedLinkId('');
        }}
        onOk={transferLinkOwnership}
        link_id={selectedLinkId}
      />
    </TooltipProvider>
  );
};

export default CompactLinkTable;
