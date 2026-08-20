import base32 from 'hi-base32';
import { Dayjs } from 'dayjs';
import { AdminStatsData, EndpointDatum, FeatureFlags } from '@/Interfaces/App';
import { Release } from '@/Interfaces/Releases';
import { requestJson, requestText, requestVoid } from '@/Api/Client';

const jsonHeaders = { 'Content-Type': 'application/json' };

export async function getReleaseNotes(): Promise<Release[]> {
  return requestJson<Release[]>('/api/core/release-notes');
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return requestJson<FeatureFlags>('/api/core/enabled');
}

export async function getShrunkVersion(): Promise<string> {
  const data = await requestJson<{ version: string }>(
    '/api/core/admin/app-version',
  );
  return data.version;
}

export async function getUserInfo(): Promise<any> {
  return requestJson('/api/core/user/info');
}

export async function getEndpointData(): Promise<EndpointDatum[]> {
  const data = await requestJson<{ stats: EndpointDatum[] }>(
    '/api/core/admin/stats/endpoint',
  );
  return data.stats;
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

  return requestJson<AdminStatsData>('/api/core/admin/stats/overview', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(req),
  });
}

export async function logout(): Promise<string> {
  const data = await requestJson<{ 'redirect-to'?: string }>(
    '/api/core/logout',
    {
      method: 'POST',
    },
  );
  return data['redirect-to'] ?? '/app/login';
}

export async function loginWithDeveloperAccount(url: string): Promise<void> {
  await requestVoid(url, { method: 'POST' });
}

export async function unBlockLink(url: string): Promise<void> {
  await requestVoid(`/api/core/role/blocked_url/entity/${base32.encode(url)}`, {
    method: 'DELETE',
  });
}

export async function blockLink(url: string, comment?: string): Promise<void> {
  await requestVoid(`/api/core/role/blocked_url/entity/${base32.encode(url)}`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({
      comment: comment || 'Link blocked via Link Management interface',
    }),
  });
}

export async function getBlockedLinks(): Promise<any> {
  return requestJson('/api/core/role/blocked_url/entity');
}

export async function getMOTD(): Promise<string> {
  return requestText('/api/core/motd');
}
