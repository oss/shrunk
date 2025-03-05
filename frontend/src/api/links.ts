import { Dayjs } from 'dayjs';
import { Link, LinkSharedWith } from '../interfaces/link';

export async function getLink(linkId: string): Promise<Link> {
  const resp = await fetch(`/api/v1/link/${linkId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await resp.json();
  return data as Link;
}

export async function getLinkStats(linkId: string): Promise<Link> {
  const resp = await fetch(`/api/v1/link/${linkId}/stats`, {
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
