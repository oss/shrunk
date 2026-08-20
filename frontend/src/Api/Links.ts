import base32 from 'hi-base32';

import { Dayjs } from 'dayjs';
import {
  BrowserStats,
  EditLinkValues,
  GeoipStats,
  Link,
  LinkSharedWith,
  OverallStats,
  VisitStats,
} from '@/Interfaces/Link';
import { requestJson, requestVoid } from '@/Api/Client';

const jsonHeaders = { 'Content-Type': 'application/json' };

export async function getLink(linkId: string): Promise<Link> {
  return requestJson<Link>(`/api/core/link/${linkId}`);
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
  orgId?: string,
): Promise<string> {
  if (trackingPixelImageType && !isTrackingPixel) {
    throw new Error(
      'trackingPixelImageType should be set only for tracking pixel links',
    );
  }

  const data = await requestJson<{ id: string }>('/api/core/link', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      is_tracking_pixel_link: isTrackingPixel,
      title,
      alias,
      long_url: url,
      expiration_time: expirationTime?.toISOString(),
      tracking_pixel_extension: trackingPixelImageType,
      org_id: orgId,
    }),
  });
  return data.id;
}

export async function deleteLink(linkId: string): Promise<void> {
  await requestVoid(`/api/core/link/${linkId}`, { method: 'DELETE' });
}

export async function deleteLinkBulk(linkIds: string[]): Promise<void> {
  await requestVoid('/api/core/link/delete_bulk', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ link_ids: linkIds }),
  });
}

export async function addCollaborator(
  linkId: string,
  collaborator: LinkSharedWith,
  role: 'editor' | 'viewer',
): Promise<void> {
  await requestVoid(`/api/core/link/${linkId}/acl`, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify({
      acl: `${role}s`,
      action: 'add',
      entry: collaborator,
    }),
  });
}

export async function removeCollaborator(
  linkId: string,
  collaborator: LinkSharedWith,
  role?: 'viewer' | 'editor',
): Promise<void> {
  const patchRequest = {
    acl: 'viewers',
    action: 'remove',
    entry: { _id: collaborator._id, type: collaborator.type },
  };

  if (role === 'viewer' || role === undefined) {
    await requestVoid(`/api/core/link/${linkId}/acl`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify(patchRequest),
    });
  }

  patchRequest.acl = 'editors';

  if (role === 'editor' || role === undefined) {
    await requestVoid(`/api/core/link/${linkId}/acl`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify(patchRequest),
    });
  }
}

export async function addCollaboratorBulk(
  linkIds: string[],
  collaborator: LinkSharedWith,
  role: 'editor' | 'viewer',
): Promise<void> {
  await requestVoid('/api/core/link/acl_bulk', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      link_ids: linkIds,
      acl: `${role}s`,
      entry: collaborator,
      action: 'add',
    }),
  });
}

export async function removeCollaboratorBulk(
  linkIds: string[],
  collaborator: LinkSharedWith,
  role?: 'viewer' | 'editor',
): Promise<void> {
  await requestVoid('/api/core/link/acl_bulk', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      link_ids: linkIds,
      acl: role ? `${role}s` : 'viewers',
      entry: { _id: collaborator._id, type: collaborator.type },
      action: 'remove',
    }),
  });
}

export async function transferLinksBulk(
  linkIds: string[],
  owner: LinkSharedWith,
): Promise<void> {
  await requestVoid('/api/core/link/transfer_bulk', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      link_ids: linkIds,
      owner,
    }),
  });
}

export async function transferLink(
  linkId: string,
  owner: LinkSharedWith,
): Promise<void> {
  await transferLinksBulk([linkId], owner);
}

export async function reverLinkExpirationDate(linkId: string): Promise<void> {
  await requestVoid(`/api/core/link/${linkId}/revert`, {
    method: 'POST',
  });
}

export async function isValidAlias(alias: string): Promise<boolean> {
  const data = await requestJson<{ valid: boolean }>(
    `/api/core/link/validate_duplicate_alias/${base32.encode(alias)}`,
  );
  return data.valid;
}

export async function getLinkStats(
  linkId: string,
  source?: string,
): Promise<OverallStats> {
  const params = new URLSearchParams();
  if (source) {
    params.append('source', source);
  }
  return requestJson<OverallStats>(
    `/api/core/link/${linkId}/stats?${params.toString()}`,
  );
}

export async function getLinkVisitsStats(
  linkId: string,
  source?: string,
  startDate?: Dayjs,
  endDate?: Dayjs,
): Promise<VisitStats> {
  const params = new URLSearchParams();
  // The endpoint defaults to one year from today if we do not set these parameters.
  if (startDate) {
    params.append('start_date', startDate.format());
  }
  if (endDate) {
    params.append('end_date', endDate.format());
  }
  if (source) {
    params.append('source', source);
  }

  return requestJson<VisitStats>(
    `/api/core/link/${linkId}/stats/visits?${params.toString()}`,
  );
}

export async function getLinkGeoIpStats(
  linkId: string,
  source?: string,
): Promise<GeoipStats> {
  const params = new URLSearchParams();
  if (source) {
    params.append('source', source);
  }
  return requestJson<GeoipStats>(
    `/api/core/link/${linkId}/stats/geoip?${params.toString()}`,
  );
}

export async function getLinkBrowserStats(
  linkId: string,
  source?: string,
): Promise<BrowserStats> {
  const params = new URLSearchParams();
  if (source) {
    params.append('source', source);
  }
  return requestJson<BrowserStats>(
    `/api/core/link/${linkId}/stats/browser?${params.toString()}`,
  );
}

export async function editLink(
  linkId: string,
  values: Partial<EditLinkValues>,
): Promise<void> {
  await requestVoid(`/api/core/link/${linkId}`, {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify(values),
  });
}

export async function searchLinks(query: any): Promise<any> {
  return requestJson('/api/core/search', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(query),
  });
}
