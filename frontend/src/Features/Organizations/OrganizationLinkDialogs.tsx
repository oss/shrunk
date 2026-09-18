import BulkTransferModal from '@/Features/Links/BulkTransferModal';
import { LinkSharedWith } from '@/Features/Links/Types';
import { OrganizationLink } from '@/Features/Organizations/Types';
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
import { useState } from 'react';

interface Props {
  transferLink: OrganizationLink | null;
  deleteLink: OrganizationLink | null;
  onCloseTransfer: () => void;
  onCloseDelete: () => void;
  onTransfer: (owner: LinkSharedWith) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function OrganizationLinkDialogs({
  transferLink,
  deleteLink,
  onCloseTransfer,
  onCloseDelete,
  onTransfer,
  onDelete,
}: Props) {
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const handleDelete = async () => {
    setDeletePending(true);
    setDeleteError(false);
    try {
      await onDelete();
    } catch {
      setDeleteError(true);
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <>
      <BulkTransferModal
        visible={transferLink !== null}
        selectedCount={1}
        allowOrganizations={false}
        onCancel={onCloseTransfer}
        onOk={onTransfer}
      />
      <AlertDialog
        open={deleteLink !== null}
        onOpenChange={(open) => {
          if (!open && !deletePending) {
            setDeleteError(false);
            onCloseDelete();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this link?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p role="alert" className="text-sm text-destructive">
              Unable to delete link.
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>No</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePending}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deletePending ? 'Deleting…' : 'Yes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
