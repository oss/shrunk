import { api, suppressToastHeader } from '@/Shared/Lib/Http';
import { FeatureFlags } from '@/App/Types';

export async function getFeatureFlags(): Promise<FeatureFlags> {
  return api<FeatureFlags>('enabled');
}

export async function getShrunkVersion(): Promise<string> {
  const data = await api<{ version: string }>('admin/app-version');
  return data.version;
}

export async function getUserInfo(): Promise<{
  netid: string;
  privileges: string[];
  motd?: string;
}> {
  return api('user/info', { headers: suppressToastHeader });
}

export async function devLogin(
  kind: 'guest' | 'user' | 'facstaff' | 'power' | 'admin',
): Promise<void> {
  await api(`devlogins/${kind}`, {
    method: 'POST',
    headers: suppressToastHeader,
  });
}

export async function logout(): Promise<string> {
  const data = await api<{ 'redirect-to'?: string }>('logout', {
    method: 'POST',
    headers: suppressToastHeader,
  });
  return data['redirect-to'] ?? '/app/login';
}
