/**
 * Implements the [[LinkSecurity]] component
 * @packageDocumentation
 */

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  getPendingLinks,
  getStatus,
  updateLinkSecurity,
} from '@/Api/GoogleSafebrowse';
import { getErrorMessage } from '@/Api/Client';
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
import { Button } from '@/Components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { PendingLink } from '@/Interfaces/GoogleSafebrowse';

interface PendingRowProps {
  document: PendingLink;
}

function PendingLinkRow(props: PendingRowProps) {
  const { document } = props;
  const [isUpdating, setIsUpdating] = useState(false);

  async function updateLink(action: 'promote' | 'reject') {
    setIsUpdating(true);
    try {
      await updateLinkSecurity(document._id, action);
      window.location.reload();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to update link security.'));
    } finally {
      setIsUpdating(false);
    }
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
          <a
            className="text-primary underline decoration-primary dark:text-foreground"
            href={document.long_url}
          >
            {document.long_url}
          </a>
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isUpdating}>
              Deny
            </Button>
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
            <Button disabled={isUpdating}>Approve</Button>
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadError(null);
      try {
        const [links, status] = await Promise.all([
          getPendingLinks(),
          getStatus(),
        ]);
        if (cancelled) return;
        setPendingLinks(links);
        setSecurityStatus(status);
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, 'Unable to load link security.'));
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div className="space-y-4">
      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load link security</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{loadError}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
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
