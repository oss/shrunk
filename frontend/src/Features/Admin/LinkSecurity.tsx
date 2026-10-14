import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getPendingLinks,
  getStatus,
  updateLinkSecurity,
} from '@/Features/Admin/Api';
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
import { Button } from '@/Shared/ui/button';
import { PendingLink } from '@/Features/Admin/Types';

interface PendingRowProps {
  document: PendingLink;
}

function PendingLinkRow(props: PendingRowProps) {
  const { document } = props;
  const queryClient = useQueryClient();
  const [action, setAction] = useState<'promote' | 'reject' | null>(null);

  const updateMutation = useMutation({
    mutationFn: (action: 'promote' | 'reject') =>
      updateLinkSecurity(document._id, action),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['admin', 'security', 'pending-links'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'security', 'pending-count'],
        }),
      ]);
    },
  });

  const updateSecurity = async () => {
    if (!action) return;
    try {
      await updateMutation.mutateAsync(action);
      setAction(null);
    } catch {
      // The mutation error remains visible in the dialog for retry.
    }
  };

  const approving = action === 'promote';

  return (
    <div className="flex flex-col gap-4 border-b py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">{document.title}</p>
        <p className="text-sm text-muted-foreground">
          {document.owner.type === 'netid'
            ? 'Owner NetID'
            : 'Owner organization'}
          : {document.owner._id}
        </p>
        <p className="text-sm break-all text-muted-foreground">
          long url:{' '}
          <a
            className="text-primary underline decoration-primary dark:text-foreground"
            href={document.long_url}
          >
            {document.long_url}
          </a>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="destructive"
          onClick={() => {
            updateMutation.reset();
            setAction('reject');
          }}
        >
          Deny
        </Button>
        <Button
          onClick={() => {
            updateMutation.reset();
            setAction('promote');
          }}
        >
          Approve
        </Button>
        <AlertDialog
          open={action !== null}
          onOpenChange={(open) => {
            if (!open && !updateMutation.isPending) setAction(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {approving ? 'Approve' : 'Deny'} this link?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {approving ? 'approve' : 'deny'} this
                link?
              </AlertDialogDescription>
            </AlertDialogHeader>
            {updateMutation.isError ? (
              <p role="alert" className="text-sm text-destructive">
                Unable to update link security.
              </p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={updateMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className={
                  approving
                    ? undefined
                    : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                }
                onClick={(event) => {
                  event.preventDefault();
                  void updateSecurity();
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending
                  ? `${approving ? 'Approving' : 'Denying'}…`
                  : approving
                    ? 'Approve'
                    : 'Deny'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function LinkSecurity() {
  const pendingLinksQuery = useQuery({
    queryKey: ['admin', 'security', 'pending-links'],
    queryFn: getPendingLinks,
  });
  const statusQuery = useQuery({
    queryKey: ['admin', 'security', 'status'],
    queryFn: getStatus,
  });
  const pendingLinks = pendingLinksQuery.data;
  const securityStatus = statusQuery.isError
    ? 'Unavailable'
    : (statusQuery.data ?? 'Loading…');

  return (
    <div className="space-y-4">
      <p>
        <strong>Current Security Status</strong>: {securityStatus}
      </p>

      {pendingLinksQuery.isError || statusQuery.isError ? (
        <Button
          variant="outline"
          onClick={() => {
            void Promise.all([
              pendingLinksQuery.refetch(),
              statusQuery.refetch(),
            ]);
          }}
        >
          Try again
        </Button>
      ) : null}

      {pendingLinksQuery.isError ? (
        <p className="text-sm text-destructive">
          Unable to load pending links.
        </p>
      ) : pendingLinks == null ? (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      ) : (
        pendingLinks.map((link) => (
          <PendingLinkRow key={link._id} document={link} />
        ))
      )}
    </div>
  );
}
