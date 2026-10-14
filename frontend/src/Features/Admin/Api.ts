import base32 from 'hi-base32';
import { Dayjs } from 'dayjs';
import { api, suppressToastHeader } from '@/Shared/Lib/Http';
import { GrantedBy } from '@/Shared/Lib/Types';
import {
  AdminStatsData,
  EndpointDatum,
  Operation,
  PendingLink,
  User,
} from '@/Features/Admin/Types';

function isPendingLink(value: unknown): value is PendingLink {
  if (typeof value !== 'object' || value === null) return false;
  const link = value as Record<string, unknown>;
  if (typeof link.owner !== 'object' || link.owner === null) return false;
  const owner = link.owner as Record<string, unknown>;
  return (
    typeof link._id === 'string' &&
    typeof link.title === 'string' &&
    typeof link.long_url === 'string' &&
    typeof owner._id === 'string' &&
    (owner.type === 'netid' || owner.type === 'org')
  );
}

export async function getStatus(): Promise<'ON' | 'OFF'> {
  const body = (
    await api<string>('security/status', {
      parseResponse: (text) => text,
    })
  ).trim();

  if (body !== 'ON' && body !== 'OFF') {
    throw new Error('Invalid security status');
  }

  return body;
}

export async function getPendingLinks(): Promise<PendingLink[]> {
  const data = await api<{ pendingLinks?: unknown } | null>(
    'security/pending_links',
  );
  const pendingLinks = data?.pendingLinks;
  if (!Array.isArray(pendingLinks) || !pendingLinks.every(isPendingLink)) {
    throw new Error('Invalid pending links response');
  }
  return pendingLinks;
}

export async function updateLinkSecurity(
  linkId: string,
  action: 'promote' | 'reject',
): Promise<void> {
  await api(`security/${action}/${linkId}`, {
    method: 'PATCH',
    headers: suppressToastHeader,
  });
}

export async function getPendingLinksCount(): Promise<number> {
  const data = await api<{ pending_links_count?: unknown }>(
    'security/pending_links/count',
  );
  if (typeof data.pending_links_count !== 'number') {
    throw new Error('Invalid pending links count response');
  }
  return data.pending_links_count;
}

export async function getEndpointData(): Promise<EndpointDatum[]> {
  const data = await api<{ stats: EndpointDatum[] }>('admin/stats/endpoint');
  return data.stats;
}

export async function getAppStats(
  begin?: Dayjs,
  end?: Dayjs,
): Promise<AdminStatsData> {
  const body =
    begin !== undefined && end !== undefined
      ? { range: { begin: begin.format(), end: end.format() } }
      : {};

  return api<AdminStatsData>('admin/stats/overview', {
    method: 'POST',
    body,
  });
}

export async function unBlockLink(url: string): Promise<void> {
  await api(`role/blocked_url/entity/${base32.encode(url)}`, {
    method: 'DELETE',
    headers: suppressToastHeader,
  });
}

export async function blockLink(url: string, comment?: string): Promise<void> {
  await api(`role/blocked_url/entity/${base32.encode(url)}`, {
    method: 'PUT',
    body: { comment: comment || 'Link blocked via Link Management interface' },
    headers: suppressToastHeader,
  });
}

export async function getBlockedLinks(): Promise<{ entities: GrantedBy[] }> {
  return api<{ entities: GrantedBy[] }>('role/blocked_url/entity');
}

export async function getAllUsers(operations: Operation[]): Promise<User[]> {
  const data = await api<{ users: User[] }>('user/all', {
    method: 'POST',
    body: { operations },
  });
  return data.users;
}

export async function getUserOptions(): Promise<Record<string, any>> {
  const data = await api<{ options: Record<string, any> }>('user/options');
  return data.options;
}

export async function removeRoleFromUser(
  netid: string,
  role: string,
): Promise<void> {
  await api('user/roles', { method: 'DELETE', body: { netid, role } });
}

export async function addRoleToUser(
  netid: string,
  role: string,
  comment?: string,
): Promise<void> {
  await api('user/roles', {
    method: 'PATCH',
    body: { role, comment, netid },
  });
}

export async function createUser(
  netid: string,
  roles: string[],
  comment?: string,
): Promise<void> {
  await api('user', {
    method: 'POST',
    body: { netid, roles, comment },
    headers: suppressToastHeader,
  });
}
