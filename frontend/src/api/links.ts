import base32 from 'hi-base32';

import { Dayjs } from 'dayjs';
import {
  BrowserStats,
  Link,
  LinkSharedWith,
  OverallStats,
  VisitStats,
  EditLinkValues,
} from '../interfaces/link';
import { GeoipStats } from '../pages/subpages/StatsCommon';

export async function getLink(linkId: string): Promise<Link> {
  const resp = await fetch(`/api/v1/link/${linkId}`, {
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
  };
  const resp = await fetch('/api/v1/link', {
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
  await fetch(`/api/v1/link/${linkId}`, { method: 'DELETE' });
}

export async function addCollaborator(
  linkId: string,
  collaborator: LinkSharedWith,
  role: 'editor' | 'viewer',
) {
  await fetch(`/api/v1/link/${linkId}/acl`, {
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
    entry: { _id: collaborator._id, type: collaborator._id },
  };

  if (role === 'viewer' || role === undefined) {
    await fetch(`/api/v1/link/${linkId}/acl`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(patchReq),
    });
  }

  patchReq.acl = 'editors';

  if (role === 'editor' || role === undefined) {
    await fetch(`/api/v1/link/${linkId}/acl`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(patchReq),
    });
  }
}

export async function reverLinkExpirationDate(linkId: string) {
  await fetch(`/api/v1/link/${linkId}/revert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function updateAlias(
  linkId: string,
  alias: string,
  description: string,
) {
  await fetch(`/api/v1/link/${linkId}/alias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alias,
      description,
    }),
  });
}

export async function deleteAlias(linkId: string, alias: string) {
  await fetch(`/api/v1/link/${linkId}/alias/${alias}`, {
    method: 'DELETE',
  });
}

export async function isValidAlias(alias: string): Promise<boolean> {
  const resp = await fetch(
    `/api/v1/link/validate_duplicate_alias/${base32.encode(alias)}`,
  );
  const data = await resp.json();

  return data.valid as boolean;
}

export async function getLinkStats(linkId: string, alias: string | null) {
  const baseApiPath =
    alias === null
      ? `/api/v1/link/${linkId}/stats`
      : `/api/v1/link/${linkId}/alias/${alias}/stats`;

  const resp = await fetch(baseApiPath);
  const data = await resp.json();

  return data as OverallStats;
}

export async function getLinkVisitsStats(linkId: string, alias: string | null) {
  const baseApiPath =
    alias === null
      ? `/api/v1/link/${linkId}/stats`
      : `/api/v1/link/${linkId}/alias/${alias}/stats`;

  const resp = await fetch(`${baseApiPath}/visits`);
  const data = await resp.json();

  return data as VisitStats;
}

export async function getLinkGeoIpStats(linkId: string, alias: string | null) {
  const baseApiPath =
    alias === null
      ? `/api/v1/link/${linkId}/stats`
      : `/api/v1/link/${linkId}/alias/${alias}/stats`;

  const resp = await fetch(`${baseApiPath}/geoip`);
  const data = await resp.json();

  return data as GeoipStats;
}

export async function getLinkBrowserStats(
  linkId: string,
  alias: string | null,
) {
  const baseApiPath =
    alias === null
      ? `/api/v1/link/${linkId}/stats`
      : `/api/v1/link/${linkId}/alias/${alias}/stats`;

  const resp = await fetch(`${baseApiPath}/browser`);
  const data = await resp.json();

  return data as BrowserStats;
}

export async function editLink(linkId: string, values: EditLinkValues) {
  const resp = await fetch(`/api/v1/link/${linkId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });

  return resp;
}

export async function searchLinks(query: any) {
  const resp = await fetch('/api/v1/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  });
  const data = await resp.json();
  return data;
}
