import base32 from 'hi-base32';
import { Dayjs } from 'dayjs';
import { api, suppressToastHeader } from '@/Shared/Lib/Http';
import {
  BrowserStats,
  Link,
  LinkSharedWith,
  OverallStats,
  VisitStats,
  EditLinkValues,
  GeoipStats,
} from '@/Features/Links/Types';

export async function getLink(linkId: string): Promise<Link> {
  return api<Link>(`link/${linkId}`);
}

/**
 * @param alias If undefined, then it will be random. Ignored if isTrackingPixel is true.
 * @returns Link ID
 */
export async function createLink(
  isTrackingPixel: boolean,
  title: string,
  url: string,
  alias?: string,
  expirationTime?: Dayjs,
  trackingPixelImageType?: '.png' | '.gif',
  org_id?: string,
  domain?: string,
): Promise<string> {
  if (trackingPixelImageType && !isTrackingPixel) {
    throw new Error(
      'trackingPixelImageType should be set only for tracking pixel links',
    );
  }

  const data = await api<{ id: string }>('link', {
    method: 'POST',
    body: {
      is_tracking_pixel_link: isTrackingPixel,
      ...(title.trim() ? { title } : {}),
      alias,
      ...(!isTrackingPixel ? { long_url: url.trim() } : {}),
      expiration_time: expirationTime?.toISOString(),
      tracking_pixel_extension: trackingPixelImageType,
      org_id,
      domain,
    },
    headers: suppressToastHeader,
  });
  return data.id;
}

export async function deleteLink(linkId: string): Promise<void> {
  await api(`link/${linkId}`, { method: 'DELETE' });
}

export async function deleteLinkBulk(linkIds: string[]): Promise<void> {
  await api('link/delete_bulk', {
    method: 'POST',
    body: { link_ids: linkIds },
  });
}

export async function addCollaborator(
  linkId: string,
  collaborator: LinkSharedWith,
  role: 'editor' | 'viewer',
): Promise<void> {
  await api(`link/${linkId}/acl`, {
    method: 'PATCH',
    body: {
      acl: `${role}s`,
      action: 'add',
      entry: collaborator,
    },
  });
}

export async function removeCollaborator(
  linkId: string,
  collaborator: LinkSharedWith,
  role?: 'viewer' | 'editor',
): Promise<void> {
  const patchReq = {
    acl: `viewers`,
    action: 'remove',
    entry: { _id: collaborator._id, type: collaborator.type },
  };

  if (role === 'viewer' || role === undefined) {
    await api(`link/${linkId}/acl`, { method: 'PATCH', body: patchReq });
  }

  patchReq.acl = 'editors';

  if (role === 'editor' || role === undefined) {
    await api(`link/${linkId}/acl`, { method: 'PATCH', body: patchReq });
  }
}

export async function addCollaboratorBulk(
  linkIds: string[],
  collaborator: LinkSharedWith,
  role: 'editor' | 'viewer',
): Promise<void> {
  await api('link/acl_bulk', {
    method: 'POST',
    body: {
      link_ids: linkIds,
      acl: `${role}s`,
      entry: collaborator,
      action: 'add',
    },
  });
}

export async function removeCollaboratorBulk(
  linkIds: string[],
  collaborator: LinkSharedWith,
  role?: 'viewer' | 'editor',
): Promise<void> {
  await api('link/acl_bulk', {
    method: 'POST',
    body: {
      link_ids: linkIds,
      acl: role ? `${role}s` : 'viewers',
      entry: { _id: collaborator._id, type: collaborator.type },
      action: 'remove',
    },
  });
}

export async function transferLinksBulk(
  linkIds: string[],
  owner: LinkSharedWith,
): Promise<void> {
  await api('link/transfer_bulk', {
    method: 'POST',
    body: { link_ids: linkIds, owner },
  });
}

export async function transferLink(
  linkId: string,
  owner: LinkSharedWith,
): Promise<void> {
  await transferLinksBulk([linkId], owner);
}

export async function reverLinkExpirationDate(linkId: string): Promise<void> {
  await api(`link/${linkId}/revert`, { method: 'POST' });
}

export async function isValidAlias(alias: string): Promise<boolean> {
  const data = await api<{ valid: boolean }>(
    `link/validate_duplicate_alias/${base32.encode(alias)}`,
  );
  return data.valid;
}

export async function getLinkStats(
  linkId: string,
  source?: string,
): Promise<OverallStats> {
  return api<OverallStats>(`link/${linkId}/stats`, {
    query: source ? { source } : undefined,
  });
}

export async function getLinkVisitsStats(
  linkId: string,
  source?: string,
  start_date?: Dayjs,
  end_date?: Dayjs,
): Promise<VisitStats> {
  // The endpoint defaults to one year from today if we don't set these
  return api<VisitStats>(`link/${linkId}/stats/visits`, {
    query: {
      ...(start_date ? { start_date: start_date.format() } : {}),
      ...(end_date ? { end_date: end_date.format() } : {}),
      ...(source ? { source } : {}),
    },
  });
}

export async function getLinkGeoIpStats(
  linkId: string,
  source?: string,
): Promise<GeoipStats> {
  return api<GeoipStats>(`link/${linkId}/stats/geoip`, {
    query: source ? { source } : undefined,
  });
}

export async function getLinkBrowserStats(
  linkId: string,
  source?: string,
): Promise<BrowserStats> {
  return api<BrowserStats>(`link/${linkId}/stats/browser`, {
    query: source ? { source } : undefined,
  });
}

export async function editLink(
  linkId: string,
  values: Partial<EditLinkValues>,
): Promise<void> {
  await api(`link/${linkId}`, { method: 'PATCH', body: values });
}

export async function searchLinks(
  query: Record<string, unknown>,
): Promise<{ count: number; results: unknown[] }> {
  return api<{ count: number; results: unknown[] }>('search', {
    method: 'POST',
    body: query,
  });
}
