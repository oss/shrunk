import {
  Organization,
  OrganizationLink,
  OrganizationMember,
  OrganizationStats,
  OrgSearchQuery,
} from '@/Interfaces/Organizations';
import { requestJson, requestVoid } from '@/Api/Client';

const jsonHeaders = { 'Content-Type': 'application/json' };

/**
 * @param which Whether to list all orgs or orgs of which the user is a member
 */
export async function getOrganizations(
  which: 'all' | 'user',
): Promise<Organization[]> {
  const result = await requestJson<{ orgs: any[] }>('/api/core/org/list', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ which }),
  });
  return result.orgs.map((org) => ({
    ...org,
    timeCreated: new Date(org.timeCreated),
    members: [],
  }));
}

export async function getOrganization(id: string): Promise<Organization> {
  const result = await requestJson<any>(`/api/core/org/${id}`);
  return {
    ...result,
    timeCreated: new Date(result.timeCreated),
    members: result.members.map(
      (member: any) =>
        ({
          ...member,
          timeCreated: new Date(member.timeCreated),
        }) as OrganizationMember,
    ),
  };
}

export async function getOrganizationStats(
  id: string,
): Promise<OrganizationStats> {
  return requestJson<OrganizationStats>(`/api/core/org/${id}/stats`);
}

export async function getOrganizationLinks(
  id: string,
): Promise<OrganizationLink[]> {
  const result = await requestJson<
    Array<
      Omit<OrganizationLink, 'created_time'> & {
        timeCreated: string;
      }
    >
  >(`/api/core/org/${id}/links`);

  return result.map(({ timeCreated, ...link }) => ({
    ...link,
    created_time: new Date(timeCreated),
  }));
}

export async function createOrg(name: string): Promise<void> {
  await requestJson<{ id: string }>('/api/core/org', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name }),
  });
}

export async function hasAssociatedUrls(id: string): Promise<boolean> {
  const data = await requestJson<{ hasAssociatedUrls: boolean }>(
    `/api/core/org/${id}/hasAssociatedUrls`,
  );
  return data.hasAssociatedUrls;
}

export async function deleteOrganization(id: string): Promise<void> {
  await requestVoid(`/api/core/org/${id}`, { method: 'DELETE' });
}

export async function renameOrganization(
  id: string,
  newName: string,
): Promise<void> {
  await requestVoid(
    `/api/core/org/${id}/rename/${encodeURIComponent(newName)}`,
    { method: 'PUT' },
  );
}

export async function addMemberToOrganization(
  organizationId: string,
  netid: string,
): Promise<void> {
  await requestVoid(
    `/api/core/org/${organizationId}/member/${encodeURIComponent(netid)}`,
    { method: 'PUT' },
  );
}

export async function addGuestToOrganization(
  organizationId: string,
  netid: string,
): Promise<void> {
  await requestVoid(
    `/api/core/org/${organizationId}/guest/${encodeURIComponent(netid)}`,
    { method: 'PUT' },
  );
}

/** Make someone an admin or not. */
export async function setAdminStatusOrganization(
  organizationId: string,
  netid: string,
  role: string,
): Promise<void> {
  await requestVoid(
    `/api/core/org/${organizationId}/member/${encodeURIComponent(netid)}`,
    {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ role }),
    },
  );
}

export async function removeMemberFromOrganization(
  organizationId: string,
  netid: string,
): Promise<void> {
  await requestVoid(
    `/api/core/org/${organizationId}/member/${encodeURIComponent(netid)}`,
    { method: 'DELETE' },
  );
}

export async function getOrganizationVisits(
  organizationId: string,
): Promise<any> {
  return requestJson(`/api/core/org/${organizationId}/stats/visits`);
}

export async function getValidAccessTokenPermissions(): Promise<string[]> {
  const data = await requestJson<{ permissions: string[] }>(
    '/api/core/org/valid-permissions',
  );
  return data.permissions;
}

export async function generateAccessToken(
  title: string,
  description: string,
  permissions: string[],
  organizationId?: string,
): Promise<string> {
  const data = await requestJson<{ access_token: string }>(
    '/api/core/org/access_token',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        title,
        description,
        permissions,
        organizationId,
      }),
    },
  );
  return data.access_token;
}

export async function getSuperTokens(): Promise<any> {
  const data = await requestJson<{ tokens: any }>('/api/core/org/super_token');
  return data.tokens;
}

export async function getAccessTokens(organizationId: string): Promise<any> {
  const data = await requestJson<{ tokens: any }>(
    `/api/core/org/${organizationId}/access_token`,
  );
  return data.tokens;
}

export async function deleteToken(tokenId: string): Promise<void> {
  await requestVoid(`/api/core/org/access_token/${tokenId}`, {
    method: 'DELETE',
  });
}

export async function searchOrgs(
  query: OrgSearchQuery,
): Promise<{ count: number; results: Organization[] }> {
  const data = await requestJson<{ count: number; results: any[] }>(
    '/api/core/search/org',
    {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(query),
    },
  );
  return {
    count: data.count,
    results: data.results.map((org) => ({
      ...org,
      timeCreated: new Date(org.timeCreated),
      members: org.members
        ? org.members.map((member: any) => ({
            ...member,
            timeCreated: new Date(member.timeCreated),
          }))
        : [],
    })),
  };
}
