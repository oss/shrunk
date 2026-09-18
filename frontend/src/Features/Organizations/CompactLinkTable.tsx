import { useState } from 'react';
import { FilterIcon } from 'lucide-react';
import { OrganizationLink } from '@/Features/Organizations/Types';
import BulkLinkActions from '@/Features/Links/BulkLinkActions';
import PaginationControls from '@/Shared/PaginationControls';
import OrganizationSearch from '@/Features/Organizations/OrganizationSearch';
import OrganizationLinkDialogs from '@/Features/Organizations/OrganizationLinkDialogs';
import OrganizationLinkTable from '@/Features/Organizations/OrganizationLinkTable';
import { useOrganizationLinksTable } from '@/Features/Organizations/useOrganizationLinksTable';
import { Button } from '@/Shared/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/Shared/ui/sheet';
import { TooltipProvider } from '@/Shared/ui/tooltip';
import { type LinkTextFilters } from '@/Shared/LinkFilterControls';

interface CompactLinkTableProps {
  org_id: string;
  userNetid: string;
  isAdmin?: boolean;
  canCreate: boolean;
}

const CompactLinkTable = ({
  org_id,
  userNetid,
  isAdmin,
  canCreate,
}: CompactLinkTableProps) => {
  const [transferTarget, setTransferTarget] = useState<OrganizationLink | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<OrganizationLink | null>(
    null,
  );
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<LinkTextFilters>({
    title: '',
    alias: '',
    owner: '',
    url: '',
  });
  const {
    loading,
    isError,
    refresh,
    transfer,
    remove,
    query: searchQuery,
    setQuery: setSearchQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedLinks,
    totalPages,
    selectedItems: selectedLinks,
    selectedIds: selectedLinkIds,
    visibleSelectedCount,
    allVisibleSelected: allPageLinksSelected,
    someVisibleSelected: somePageLinksSelected,
    setItemSelected: setLinkSelected,
    toggleVisibleSelection: togglePageSelection,
    clearSelection,
  } = useOrganizationLinksTable(org_id, isAdmin);

  const shareDisabled = selectedLinks.some((link) => !link.canEdit);
  const deleteDisabled = selectedLinks.some((link) => link.canDelete !== true);
  const transferDisabled = selectedLinks.some(
    (link) => link.canTransfer !== true,
  );

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
              draft={filterDraft}
              onDraftChange={setFilterDraft}
              setQuery={setSearchQuery}
            />
          </div>
        </aside>
        <div className="min-w-0">
          <TooltipProvider>
            <div className="space-y-4">
              <OrganizationLinkTable
                links={paginatedLinks}
                loading={loading}
                isError={isError}
                onRetry={() => void refresh()}
                orgId={org_id}
                isAdmin={isAdmin}
                selectedIds={selectedLinkIds}
                allSelected={allPageLinksSelected}
                someSelected={somePageLinksSelected}
                onToggleAll={togglePageSelection}
                onSelect={setLinkSelected}
                onTransfer={setTransferTarget}
                onDelete={setDeleteTarget}
              />
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
            <OrganizationLinkDialogs
              transferLink={transferTarget}
              deleteLink={deleteTarget}
              onCloseTransfer={() => setTransferTarget(null)}
              onCloseDelete={() => setDeleteTarget(null)}
              onTransfer={async (owner) => {
                if (!transferTarget) return;
                await transfer({ id: transferTarget._id, owner });
                setTransferTarget(null);
              }}
              onDelete={async () => {
                if (!deleteTarget) return;
                await remove(deleteTarget._id);
                setDeleteTarget(null);
              }}
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
              onRefresh={refresh}
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
            draft={filterDraft}
            onDraftChange={setFilterDraft}
            setQuery={setSearchQuery}
            className="mt-6"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CompactLinkTable;
