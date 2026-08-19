import { useState } from 'react';
import { ArrowRightLeftIcon, Trash2Icon, UsersIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import {
  addCollaboratorBulk,
  deleteLinkBulk,
  transferLinksBulk,
} from '@/Api/Links';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
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
} from '@/Components/ui/alert-dialog';
import { LinkSharedWith } from '@/Interfaces/Link';
import BulkTransferModal from '@/Modals/BulkTransferModal';
import CollaboratorModal, { Collaborator } from '@/Modals/CollaboratorModal';

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

  const runAction = async (
    action: () => Promise<unknown>,
    success: string,
    failure: string,
    close: () => void,
  ) => {
    try {
      await action();
      toast.success(success);
      close();
      onClear();
    } catch {
      toast.error(failure);
    } finally {
      await onRefresh();
    }
  };

  const share = (activeTab: 'netid' | 'org', entity: Collaborator) =>
    runAction(
      () =>
        addCollaboratorBulk(
          selectedIds,
          { _id: entity._id, type: activeTab },
          entity.role as 'editor' | 'viewer',
        ),
      'Selected links shared successfully',
      'Failed to share selected links',
      () => setShareOpen(false),
    );

  const transfer = (owner: LinkSharedWith) =>
    runAction(
      () => transferLinksBulk(selectedIds, owner),
      'Selected links transferred successfully',
      'Failed to transfer selected links',
      () => setTransferOpen(false),
    );

  const remove = () =>
    runAction(
      () => deleteLinkBulk(selectedIds),
      'Selected links deleted successfully',
      'Failed to delete selected links',
      () => setDeleteOpen(false),
    );

  const actions = [
    {
      label: 'Share',
      disabled: shareDisabled,
      reason: 'Only links you can edit can be shared.',
      open: () => setShareOpen(true),
      icon: UsersIcon,
    },
    {
      label: 'Transfer',
      disabled: transferDisabled,
      reason: 'Only links you own can be transferred.',
      open: () => setTransferOpen(true),
      icon: ArrowRightLeftIcon,
    },
    {
      label: 'Delete',
      disabled: deleteDisabled,
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
        onChangeEntity={() => {}}
        onRemoveEntity={() => {}}
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
              onClick={remove}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
