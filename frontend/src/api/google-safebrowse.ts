import { PendingLink } from '@/interfaces/google-safebrowse';

export async function getStatus(): Promise<string> {
  const resp = await fetch('/api/core/security/status');
  if (!resp.ok) {
    return 'OFF';
  }

  const body = await resp.text();
  try {
    const data: unknown = JSON.parse(body);
    if (typeof data === 'string') {
      return data;
    }
    if (
      data !== null &&
      typeof data === 'object' &&
      'status' in data &&
      typeof data.status === 'string'
    ) {
      return data.status;
    }
  } catch {
    // The endpoint currently returns ON/OFF as plain text.
  }

  return body || 'OFF';
}

export async function getPendingLinks(): Promise<PendingLink[]> {
  const resp = await fetch('/api/core/security/pending_links');
  if (!resp.ok) {
    return [];
  }

  const data: unknown = await resp.json().catch(() => undefined);
  if (
    data === null ||
    typeof data !== 'object' ||
    !('pendingLinks' in data) ||
    !Array.isArray(data.pendingLinks)
  ) {
    return [];
  }

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
  if (!resp.ok) {
    return 0;
  }

  const data: unknown = await resp.json().catch(() => undefined);
  if (
    data === null ||
    typeof data !== 'object' ||
    !('pending_links_count' in data) ||
    typeof data.pending_links_count !== 'number'
  ) {
    return 0;
  }

  return data.pending_links_count;
}
