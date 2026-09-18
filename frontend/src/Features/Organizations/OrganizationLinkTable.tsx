import { OrganizationLink } from '@/Features/Organizations/Types';
import OrganizationLinkRow from '@/Features/Organizations/OrganizationLinkRow';
import { Checkbox } from '@/Shared/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Shared/ui/table';

interface Props {
  links: OrganizationLink[];
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  orgId: string;
  isAdmin?: boolean;
  selectedIds: string[];
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: (selected: boolean) => void;
  onSelect: (link: OrganizationLink, selected: boolean) => void;
  onTransfer: (link: OrganizationLink) => void;
  onDelete: (link: OrganizationLink) => void;
}

export default function OrganizationLinkTable({
  links,
  loading,
  isError,
  onRetry,
  orgId,
  isAdmin,
  selectedIds,
  allSelected,
  someSelected,
  onToggleAll,
  onSelect,
  onTransfer,
  onDelete,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow className="border-b border-border hover:bg-transparent">
            <TableHead className="w-12">
              <Checkbox
                aria-label="Select all links on this page"
                checked={
                  allSelected ? true : someSelected ? 'indeterminate' : false
                }
                onCheckedChange={(value) => onToggleAll(value === true)}
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
          {isError ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center">
                <div className="flex flex-col items-center gap-2 text-destructive">
                  <span>Unable to load organization links.</span>
                  <button type="button" className="underline" onClick={onRetry}>
                    Retry
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ) : loading || links.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-8 text-center text-muted-foreground"
              >
                {loading ? 'Loading...' : 'No links found.'}
              </TableCell>
            </TableRow>
          ) : (
            links.map((link) => (
              <OrganizationLinkRow
                key={link._id}
                link={link}
                orgId={orgId}
                isAdmin={isAdmin}
                selected={selectedIds.includes(link._id)}
                onSelect={(selected) => onSelect(link, selected)}
                onTransfer={() => onTransfer(link)}
                onDelete={() => onDelete(link)}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
