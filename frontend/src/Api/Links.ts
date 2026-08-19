import base32 from 'hi-base32';

import { Dayjs } from 'dayjs';
import {
  BrowserStats,
  Link,
  LinkSharedWith,
  OverallStats,
  VisitStats,
  EditLinkValues,
  GeoipStats,
} from '@/Interfaces/Link';

async function throwApiError(resp: Response): Promise<never> {
  let message = `Request failed with status ${resp.status}`;
  try {
    const data: unknown = await resp.json();
    if (
      typeof data === 'object' &&
      data !== null &&
      'errors' in data &&
      Array.isArray(data.errors) &&
      data.errors.every((error) => typeof error === 'string')
    ) {
      message = data.errors.join(', ');
    }
  } catch {
    // Some Flask error responses are HTML or have no body.
  }
  throw new Error(message);
}

export async function getLink(linkId: string): Promise<Link> {
  const resp = await fetch(`/api/core/link/${linkId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await resp.json();
  return data as Link;
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
): Promise<string> {
  if (trackingPixelImageType && !isTrackingPixel) {
    throw new Error(
      'trackingPixelImageType should be set only for tracking pixel links',
    );
  }

  const req = {
    is_tracking_pixel_link: isTrackingPixel,
    title,
    alias,
    long_url: url,
    expiration_time: expirationTime?.toISOString(),
    tracking_pixel_extension: trackingPixelImageType,
    org_id,
  };
  const resp = await fetch('/api/core/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.errors.join(', '));
  }
  return data.id as string;
}

export async function deleteLink(linkId: string) {
  await fetch(`/api/core/link/${linkId}`, { method: 'DELETE' });
}

export async function deleteLinkBulk(linkIds: string[]) {
  const resp = await fetch(`/api/core/link/delete_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ link_ids: linkIds }),
  });
  if (!resp.ok) {
    await throwApiError(resp);
  }
}

export async function addCollaborator(
  linkId: string,
  collaborator: LinkSharedWith,
  role: 'editor' | 'viewer',
) {
  await fetch(`/api/core/link/${linkId}/acl`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
    },
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
) {
  const patchReq = {
    acl: `viewers`,
    action: 'remove',
    entry: { _id: collaborator._id, type: collaborator.type },
  };

  if (role === 'viewer' || role === undefined) {
    await fetch(`/api/core/link/${linkId}/acl`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(patchReq),
    });
  }

  patchReq.acl = 'editors';

  if (role === 'editor' || role === undefined) {
    await fetch(`/api/core/link/${linkId}/acl`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(patchReq),
    });
  }
}

export async function addCollaboratorBulk(
  linkIds: string[],
  collaborator: LinkSharedWith,
  role: 'editor' | 'viewer',
) {
  const resp = await fetch(`/api/core/link/acl_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      link_ids: linkIds,
      acl: `${role}s`,
      entry: collaborator,
      action: 'add',
    }),
  });
  if (!resp.ok) {
    await throwApiError(resp);
  }
}

export async function removeCollaboratorBulk(
  linkIds: string[],
  collaborator: LinkSharedWith,
  role?: 'viewer' | 'editor',
) {
  const resp = await fetch(`/api/core/link/acl_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      link_ids: linkIds,
      acl: role ? `${role}s` : 'viewers',
      entry: { _id: collaborator._id, type: collaborator.type },
      action: 'remove',
    }),
  });
  if (!resp.ok) {
    await throwApiError(resp);
  }
}

export async function transferLinksBulk(
  linkIds: string[],
  owner: LinkSharedWith,
) {
  const resp = await fetch(`/api/core/link/transfer_bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      link_ids: linkIds,
      owner,
    }),
  });
  if (!resp.ok) {
    await throwApiError(resp);
  }
}

export async function transferLink(
  linkId: string,
  owner: LinkSharedWith,
): Promise<void> {
  await transferLinksBulk([linkId], owner);
}

export async function reverLinkExpirationDate(linkId: string) {
  await fetch(`/api/core/link/${linkId}/revert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function isValidAlias(alias: string): Promise<boolean> {
  const resp = await fetch(
    `/api/core/link/validate_duplicate_alias/${base32.encode(alias)}`,
  );
  const data = await resp.json();

  return data.valid as boolean;
}

export async function getLinkStats(linkId: string, source?: string) {
  const params = new URLSearchParams();

  if (source) {
    params.append('source', source);
  }

  const resp = await fetch(
    `/api/core/link/${linkId}/stats?${params.toString()}`,
  );
  const data = await resp.json();

  return data as OverallStats;
}

export async function getLinkVisitsStats(
  linkId: string,
  source?: string,
  start_date?: Dayjs,
  end_date?: Dayjs,
) {
  const params = new URLSearchParams();
  // The endpoint defaults to one year from today if we don't set
  // these parameters
  if (start_date) {
    params.append('start_date', start_date.format());
  }
  if (end_date) {
    params.append('end_date', end_date.format());
  }
  if (source) {
    params.append('source', source);
  }

  const url = `/api/core/link/${linkId}/stats/visits?${params.toString()}`;
  const resp = await fetch(url);
  const data = await resp.json();

  return data as VisitStats;
}

export async function getLinkGeoIpStats(linkId: string, source?: string) {
  const params = new URLSearchParams();
  if (source) {
    params.append('source', source);
  }
  const resp = await fetch(
    `/api/core/link/${linkId}/stats/geoip?${params.toString()}`,
  );
  const data = await resp.json();

  return data as GeoipStats;
}

export async function getLinkBrowserStats(linkId: string, source?: string) {
  const params = new URLSearchParams();
  if (source) {
    params.append('source', source);
  }
  const resp = await fetch(
    `/api/core/link/${linkId}/stats/browser?${params.toString()}`,
  );
  const data = await resp.json();

  return data as BrowserStats;
}

export async function editLink(
  linkId: string,
  values: Partial<EditLinkValues>,
) {
  const resp = await fetch(`/api/core/link/${linkId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });

  return resp;
}

export async function searchLinks(query: any) {
  const resp = await fetch('/api/core/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  });
  const data = await resp.json();
  return data;
}
