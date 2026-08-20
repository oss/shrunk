import { PendingLink } from '@/Interfaces/GoogleSafebrowse';
import { ApiError, requestJson, requestText, requestVoid } from '@/Api/Client';

function invalidResponse(message: string): ApiError {
  return new ApiError({ code: 'INVALID_RESPONSE', message });
}

export async function getStatus(): Promise<string> {
  const body = await requestText('/api/core/security/status');
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

  if (body.trim()) {
    return body.trim();
  }
  throw invalidResponse(
    'The server returned an invalid security status. Please try again.',
  );
}

export async function getPendingLinks(): Promise<PendingLink[]> {
  const data = await requestJson<{ pendingLinks?: unknown }>(
    '/api/core/security/pending_links',
  );
  if (!Array.isArray(data.pendingLinks)) {
    throw invalidResponse(
      'The server returned an invalid pending-links response. Please try again.',
    );
  }
  return data.pendingLinks as PendingLink[];
}

export async function updateLinkSecurity(
  linkId: string,
  action: 'promote' | 'reject',
): Promise<void> {
  await requestVoid(`/api/core/security/${action}/${linkId}`, {
    method: 'PATCH',
  });
}

export async function getPendingLinksCount(): Promise<number> {
  const data = await requestJson<{ pending_links_count?: unknown }>(
    '/api/core/security/pending_links/count',
  );
  if (typeof data.pending_links_count !== 'number') {
    throw invalidResponse(
      'The server returned an invalid pending-links count. Please try again.',
    );
  }
  return data.pending_links_count;
}
