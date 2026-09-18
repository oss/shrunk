import { api } from '@/Shared/Lib/Http';
import { AccessTokenData } from '@/Features/AccessTokens/Types';

export async function getValidAccessTokenPermissions(): Promise<string[]> {
  const data = await api<{ permissions: string[] }>('org/valid-permissions');
  return data.permissions;
}

export async function generateAccessToken(
  title: string,
  description: string,
  permissions: string[],
  organizationId?: string,
): Promise<string> {
  const data = await api<{ access_token: string }>('org/access_token', {
    method: 'POST',
    body: { title, description, permissions, organizationId },
  });
  return data.access_token;
}

export async function getSuperTokens(): Promise<AccessTokenData[]> {
  const data = await api<{ tokens: AccessTokenData[] }>('org/super_token');
  return data.tokens;
}

export async function getAccessTokens(
  organizationId: string,
): Promise<AccessTokenData[]> {
  const data = await api<{ tokens: AccessTokenData[] }>(
    `org/${organizationId}/access_token`,
  );
  return data.tokens;
}

export async function deleteToken(tokenId: string): Promise<void> {
  await api(`org/access_token/${tokenId}`, { method: 'DELETE' });
}
