import { PendingLink } from '../interfaces/google-safebrowse';

export async function getStatus(): Promise<string> {
  const resp = await fetch('/api/v1/security/status');
  const data = await resp.json();
  return data;
}

export async function getPendingLinks(): Promise<PendingLink[]> {
  const resp = await fetch('/api/v1/security/pending_links');
  const data = await resp.json();
  return data.pendingLinks as PendingLink[];
}
