import { requestJson, requestVoid } from '@/Api/Client';

const jsonHeaders = { 'Content-Type': 'application/json' };

export async function removeRoleFromUser(
  netid: string,
  role: string,
): Promise<void> {
  await requestVoid('/api/core/user/roles', {
    method: 'DELETE',
    headers: jsonHeaders,
    body: JSON.stringify({ netid, role }),
  });
}

export async function addRoleToUser(
  netid: string,
  role: string,
  comment?: string,
): Promise<void> {
  await requestVoid('/api/core/user/roles', {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify({ role, comment, netid }),
  });
}

export async function getAllUsers(operations: unknown[] = []): Promise<any[]> {
  const data = await requestJson<{ users: any[] }>('/api/core/user/all', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ operations }),
  });
  return data.users;
}

export async function getUserOptions(): Promise<Record<string, any>> {
  const data = await requestJson<{ options: Record<string, any> }>(
    '/api/core/user/options',
  );
  return data.options;
}

export async function createUser(
  netid: string,
  roles: string[],
  comment?: string,
): Promise<void> {
  await requestVoid('/api/core/user', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ netid, roles, comment }),
  });
}

export async function removeUser(netid: string): Promise<void> {
  await requestVoid('/api/core/user', {
    method: 'DELETE',
    headers: jsonHeaders,
    body: JSON.stringify({ netid }),
  });
}
