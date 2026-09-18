import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { deleteLink, transferLink } from '@/Features/Links/Api';
import { LinkSharedWith } from '@/Features/Links/Types';
import { getOrganizationLinks } from '@/Features/Organizations/Api';
import { OrganizationLink } from '@/Features/Organizations/Types';

const NO_LINKS: OrganizationLink[] = [];

export function useOrganizationLinks(orgId: string) {
  const query = useQuery({
    queryKey: ['organization-links', orgId],
    queryFn: () => getOrganizationLinks(orgId),
  });

  const refresh = async () => {
    await query.refetch();
  };

  const transferMutation = useMutation({
    mutationFn: ({ id, owner }: { id: string; owner: LinkSharedWith }) =>
      transferLink(id, owner),
    onSuccess: () => toast.success('Link ownership transferred successfully'),
    onError: () => toast.error('Error transferring link ownership'),
    onSettled: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteLink,
    onSuccess: async () => {
      toast.success('Link deleted successfully');
      await refresh();
    },
    onError: () => toast.error('Failed to delete link'),
  });

  return {
    links: query.data ?? NO_LINKS,
    loading: query.isPending,
    isError: query.isError,
    refresh,
    transfer: transferMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}
