import { FeatureFlags } from '../interfaces/app';
import { Release } from '../interfaces/releases';

export async function getReleaseNotes(): Promise<Release[]> {
  const resp = await fetch('/api/v1/release-notes', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await resp.json();
  return data as Release[];
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const resp = await fetch('/api/v1/enabled');
  const data = await resp.json();
  return data as FeatureFlags;
}

export async function logout() {
  const resp = await fetch('/api/v1/logout', {
    method: 'POST',
  });
  const data = await resp.json();
  if ('redirect-to' in data) {
    return data['redirect-to'];
  }

  return '/app/login';
}
