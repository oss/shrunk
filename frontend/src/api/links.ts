import base32 from 'hi-base32';

import { Dayjs, dayjs } from 'dayjs';
import {
  BrowserStats,
  Link,
  LinkSharedWith,
  OverallStats,
  VisitStats,
  EditLinkValues,
  SearchQuery,
  GeoipStats,
} from '../interfaces/link';

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

export async function getLinkStats(linkId: string) {
  const resp = await fetch(`/api/core/link/${linkId}/stats`);
  const data = await resp.json();

  return data as OverallStats;
}

export async function getLinkVisitsStats(
  linkId: string,
  start_date: dayjs,
  end_date: dayjs,
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

  const url = `/api/core/link/${linkId}/stats/visits?${params.toString()}`;
  const resp = await fetch(url);
  const data = await resp.json();

  return data as VisitStats;
}

export async function getLinkGeoIpStats(linkId: string) {
  const resp = await fetch(`/api/core/link/${linkId}/stats/geoip`);
  const data = await resp.json();

  return data as GeoipStats;
}

export async function getLinkBrowserStats(linkId: string) {
  const resp = await fetch(`/api/core/link/${linkId}/stats/browser`);
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

export async function updateUserFilterOptions(options: SearchQuery) {
  await fetch(`/api/core/user/options/filter`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filterOptions: options }),
  });
}
