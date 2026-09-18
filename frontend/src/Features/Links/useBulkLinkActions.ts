import { useState } from 'react';
import { toast } from 'sonner';
import {
  addCollaboratorBulk,
  deleteLinkBulk,
  transferLinksBulk,
} from '@/Features/Links/Api';
import { LinkSharedWith } from '@/Features/Links/Types';

export function useBulkLinkActions(
  selectedIds: string[],
  onClear: () => void,
  onRefresh: () => Promise<void>,
) {
  const [isPending, setIsPending] = useState(false);

  const run = async (
    action: () => Promise<unknown>,
    success: string,
    failure: string,
  ) => {
    setIsPending(true);
    try {
      await action();
      toast.success(success);
      onClear();
    } catch (error) {
      toast.error(failure);
      throw error;
    } finally {
      try {
        await onRefresh();
      } catch {
        toast.error('Unable to refresh links.');
      }
      setIsPending(false);
    }
  };

  return {
    isPending,
    share: (owner: LinkSharedWith, role: 'editor' | 'viewer') =>
      run(
        () => addCollaboratorBulk(selectedIds, owner, role),
        'Selected links shared successfully',
        'Failed to share selected links',
      ),
    transfer: (owner: LinkSharedWith) =>
      run(
        () => transferLinksBulk(selectedIds, owner),
        'Selected links transferred successfully',
        'Failed to transfer selected links',
      ),
    remove: () =>
      run(
        () => deleteLinkBulk(selectedIds),
        'Selected links deleted successfully',
        'Failed to delete selected links',
      ),
  };
}
