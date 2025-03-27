import { PendingLink } from '../interfaces/google-safebrowse';

export async function getStatus(): Promise<string> {
  const resp = await fetch('/api/core/security/status');
  const data = await resp.json();
  return data;
}

export async function getPendingLinks(): Promise<PendingLink[]> {
  const resp = await fetch('/api/core/security/pending_links');
  const data = await resp.json();
  return data.pendingLinks as PendingLink[];
}

export async function updateLinkSecurity(
  linkId: string,
  action: 'promote' | 'reject',
) {
  await fetch(`/api/core/security/${action}/${linkId}`, {
    method: 'PATCH',
  });
}

export async function getPendingLinksCount(): Promise<number> {
  const resp = await fetch('/api/core/security/pending_links/count');
  const data = await resp.json();
  return data.pending_links_count as number;
}
