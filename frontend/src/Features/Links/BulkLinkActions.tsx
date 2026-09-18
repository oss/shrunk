import { useState } from 'react';
import { ArrowRightLeftIcon, Trash2Icon, UsersIcon, XIcon } from 'lucide-react';
import { Button } from '@/Shared/ui/button';
import { Checkbox } from '@/Shared/ui/checkbox';
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
} from '@/Shared/ui/alert-dialog';
import { LinkSharedWith } from '@/Features/Links/Types';
import BulkTransferModal from '@/Features/Links/BulkTransferModal';
import CollaboratorModal, { Collaborator } from '@/Shared/CollaboratorModal';
import { useBulkLinkActions } from '@/Features/Links/useBulkLinkActions';

interface Props {
  selectedIds: string[];
  actorId: string;
  canCreate: boolean;
  shareDisabled: boolean;
  transferDisabled: boolean;
  deleteDisabled: boolean;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  visibleSelectedCount: number;
  totalVisible: number;
  onToggleVisible: (checked: boolean) => void;
  onClear: () => void;
  onRefresh: () => Promise<void>;
}

export default function BulkLinkActions({
  selectedIds,
  actorId,
  canCreate,
  shareDisabled,
  transferDisabled,
  deleteDisabled,
  allVisibleSelected,
  someVisibleSelected,
  visibleSelectedCount,
  totalVisible,
  onToggleVisible,
  onClear,
  onRefresh,
}: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const bulkActions = useBulkLinkActions(selectedIds, onClear, onRefresh);

  const share = async (activeTab: 'netid' | 'org', entity: Collaborator) => {
    await bulkActions.share(
      { _id: entity._id, type: activeTab },
      entity.role as 'editor' | 'viewer',
    );
    setShareOpen(false);
  };

  const transfer = async (owner: LinkSharedWith) => {
    await bulkActions.transfer(owner);
    setTransferOpen(false);
  };

  const remove = async () => {
    await bulkActions.remove();
    setDeleteOpen(false);
  };

  const actions = [
    {
      label: 'Share',
      disabled: shareDisabled || bulkActions.isPending,
      reason: 'Only links you can edit can be shared.',
      open: () => setShareOpen(true),
      icon: UsersIcon,
    },
    {
      label: 'Transfer',
      disabled: transferDisabled || bulkActions.isPending,
      reason: 'Only links you own can be transferred.',
      open: () => setTransferOpen(true),
      icon: ArrowRightLeftIcon,
    },
    {
      label: 'Delete',
      disabled: deleteDisabled || bulkActions.isPending,
      reason: 'Only links you own can be deleted.',
      open: () => setDeleteOpen(true),
      icon: Trash2Icon,
    },
  ];

  return (
    <>
      {selectedIds.length > 0 && (
        <TooltipProvider>
          <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-md border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg animate-in zoom-in-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Checkbox
                    aria-label="Select all visible links"
                    checked={
                      allVisibleSelected
                        ? true
                        : someVisibleSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(checked) =>
                      onToggleVisible(checked === true)
                    }
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {someVisibleSelected
                  ? 'Select all visible links'
                  : 'Deselect all visible links'}
              </TooltipContent>
            </Tooltip>
            <span className="text-sm font-semibold whitespace-nowrap">
              {visibleSelectedCount} of {totalVisible} selected on this page
            </span>
            <div className="flex items-center gap-1">
              {actions.map(({ label, disabled, reason, open, icon: Icon }) => (
                <Tooltip key={label}>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`${label} selected links`}
                        disabled={disabled}
                        className={
                          label === 'Delete'
                            ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                            : undefined
                        }
                        onClick={open}
                      >
                        <Icon />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {disabled ? reason : `${label} selected links`}
                  </TooltipContent>
                </Tooltip>
              ))}
              <Button
                size="icon"
                variant="ghost"
                aria-label="Clear selected links"
                onClick={onClear}
              >
                <XIcon />
              </Button>
            </div>
          </div>
        </TooltipProvider>
      )}
      <CollaboratorModal
        _id={actorId}
        canCreate={canCreate}
        visible={shareOpen}
        people={[]}
        roles={[
          { value: 'editor', label: 'Editor' },
          { value: 'viewer', label: 'Viewer' },
        ]}
        onAddEntity={share}
        onChangeEntity={async () => {}}
        onRemoveEntity={async () => {}}
        onOk={() => setShareOpen(false)}
        onCancel={() => setShareOpen(false)}
        multipleMasters
      />
      <BulkTransferModal
        visible={transferOpen}
        selectedCount={selectedIds.length}
        onOk={transfer}
        onCancel={() => setTransferOpen(false)}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected links?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {selectedIds.length}{' '}
              {selectedIds.length === 1 ? 'link' : 'links'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkActions.isPending}
              onClick={(event) => {
                event.preventDefault();
                void remove().catch(() => undefined);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
