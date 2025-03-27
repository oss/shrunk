import base32 from 'hi-base32';
import { Dayjs } from 'dayjs';
import { AdminStatsData, EndpointDatum, FeatureFlags } from '../interfaces/app';
import { Release } from '../interfaces/releases';

export async function getReleaseNotes(): Promise<Release[]> {
  const resp = await fetch('/api/core/release-notes', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await resp.json();
  return data as Release[];
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const resp = await fetch('/api/core/enabled');
  const data = await resp.json();
  return data as FeatureFlags;
}

export async function getShrunkVersion(): Promise<string> {
  const resp = await fetch('/api/core/admin/app-version');
  const data = await resp.json();
  return data.version as string;
}

export async function getUserInfo() {
  const response = await fetch('/api/core/user/info');
  const data = await response.json();
  return data as any;
}

export async function getEndpointData() {
  const response = await fetch('/api/core/admin/stats/endpoint');
  const data = await response.json();
  return data.stats as EndpointDatum[];
}

export async function getAppStats(
  begin?: Dayjs,
  end?: Dayjs,
): Promise<AdminStatsData> {
  const req: Record<string, any> = {};
  if (begin !== undefined && end !== undefined) {
    req.range = {
      begin: begin.format(),
      end: end.format(),
    };
  }

  const resp = await fetch('/api/core/admin/stats/overview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const data = await resp.json();

  return data as AdminStatsData;
}

export async function logout() {
  const resp = await fetch('/api/core/logout', {
    method: 'POST',
  });
  const data = await resp.json();
  if ('redirect-to' in data) {
    return data['redirect-to'];
  }

  return '/app/login';
}

export async function unBlockLink(url: string) {
  const encodedUrl = base32.encode(url);
  const response = await fetch(
    `/api/core/role/blocked_url/entity/${encodedUrl}`,
    {
      method: 'DELETE',
    },
  );

  if (!response.ok) {
    throw new Error('Failed to unblock link');
  }
}

export async function blockLink(url: string, comment?: string) {
  const encodedUrl = base32.encode(url);
  const response = await fetch(
    `/api/core/role/blocked_url/entity/${encodedUrl}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: comment || 'Link blocked via Link Management interface',
      }),
    },
  );

  if (!response.ok) {
    throw new Error('Failed to block link');
  }
}

export async function getBlockedLinks() {
  const resp = await fetch(`/api/core/role/blocked_url/entity`);
  const data = resp.json();
  return data;
}

export async function getMOTD() {
  const resp = await fetch(`/api/core/motd`);
  return resp.text;
}
