/**
 * Implements the [[LinkSecurity]] component
 * @packageDocumentation
 */

import { useEffect, useState } from 'react';

import {
  getPendingLinks,
  getStatus,
  updateLinkSecurity,
} from '@/api/google-safebrowse';
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
import { Button } from '@/components/ui/button';
import { PendingLink } from '@/interfaces/google-safebrowse';

interface PendingRowProps {
  document: PendingLink;
}

function PendingLinkRow(props: PendingRowProps) {
  const { document } = props;

  function updateLink(action: 'promote' | 'reject') {
    updateLinkSecurity(document._id, action);
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-4 border-b py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">{document.title}</p>
        <p className="text-sm text-muted-foreground">
          netID of creator: {document.netid}
        </p>
        <p className="text-sm break-all text-muted-foreground">
          long url:{' '}
          <a className="text-primary underline" href={document.long_url}>
            {document.long_url}
          </a>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Deny</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deny this link?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to deny this link?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => updateLink('reject')}
              >
                Deny
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button>Approve</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve this link?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve this link?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => updateLink('promote')}>
                Approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function LinkSecurity() {
  const [pendingLinks, setPendingLinks] = useState<Array<PendingLink> | null>(
    null,
  );

  const [securityStatus, setSecurityStatus] = useState<string>('OFF');

  useEffect(() => {
    getPendingLinks().then((links: PendingLink[]) => {
      setPendingLinks(links);
    });

    getStatus().then((status: string) => {
      setSecurityStatus(status);
    });
  }, []);

  return (
    <div className="space-y-4">
      <p>
        <strong>Current Security Status</strong>: {securityStatus}
      </p>

      {pendingLinks == null ? (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      ) : (
        pendingLinks.map((link) => (
          <PendingLinkRow key={link._id} document={link} />
        ))
      )}
    </div>
  );
}
