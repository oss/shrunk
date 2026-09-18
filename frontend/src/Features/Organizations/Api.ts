import { api, suppressToastHeader } from '@/Shared/Lib/Http';
import {
  Organization,
  OrganizationLink,
  OrganizationMember,
  OrganizationStats,
  OrganizationVisitDatum,
  OrgSearchQuery,
} from '@/Features/Organizations/Types';

/**
 * @param which Whether to list all orgs or orgs of which the user is a member
 */
export async function getOrganizations(
  which: 'all' | 'user',
): Promise<Organization[]> {
  const result = await api<{ orgs: any[] }>('org/list', {
    method: 'POST',
    body: { which },
  });
  return result.orgs.map((org: any) => ({
    ...org,
    timeCreated: new Date(org.timeCreated),
    members: [],
  }));
}

export async function getOrganization(id: string): Promise<Organization> {
  const result = await api<any>(`org/${id}`);
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
  return api<OrganizationStats>(`org/${id}/stats`);
}

export async function getOrganizationLinks(
  id: string,
): Promise<OrganizationLink[]> {
  const result = await api<any[]>(`org/${id}/links`);

  return result.map(
    ({
      timeCreated,
      ...link
    }: Omit<OrganizationLink, 'created_time'> & {
      timeCreated: string;
    }) => ({
      ...link,
      created_time: new Date(timeCreated),
    }),
  );
}

export async function createOrg(name: string): Promise<void> {
  await api('org', {
    method: 'POST',
    body: { name },
    headers: suppressToastHeader,
  });
}

export async function hasAssociatedUrls(id: string): Promise<boolean> {
  const data = await api<{ hasAssociatedUrls: boolean }>(
    `org/${id}/hasAssociatedUrls`,
  );
  return data.hasAssociatedUrls;
}

export async function deleteOrganization(id: string): Promise<void> {
  await api(`org/${id}`, { method: 'DELETE' });
}

export async function renameOrganization(
  id: string,
  newName: string,
): Promise<void> {
  await api(`org/${id}/rename/${newName}`, {
    method: 'PUT',
    headers: suppressToastHeader,
  });
}

export async function addMemberToOrganization(
  organizationId: string,
  netid: string,
): Promise<void> {
  await api(`org/${organizationId}/member/${netid}`, { method: 'PUT' });
}

export async function addGuestToOrganization(
  organizationId: string,
  netid: string,
): Promise<void> {
  await api(`org/${organizationId}/guest/${netid}`, { method: 'PUT' });
}

/**
 * Make someone an admin or not.
 */
export async function setAdminStatusOrganization(
  organizationId: string,
  netid: string,
  role: string,
): Promise<void> {
  await api(`org/${organizationId}/member/${netid}`, {
    method: 'PATCH',
    body: { role },
  });
}

export async function removeMemberFromOrganization(
  organizationId: string,
  netid: string,
): Promise<void> {
  await api(`org/${organizationId}/member/${netid}`, { method: 'DELETE' });
}

export async function getOrganizationVisits(
  organizationId: string,
): Promise<{ visits: OrganizationVisitDatum[] }> {
  return api(`org/${organizationId}/stats/visits`);
}

export async function searchOrgs(
  query: OrgSearchQuery,
  signal?: AbortSignal,
): Promise<{ count: number; results: Organization[] }> {
  const data = await api<{ count: number; results: any[] }>('search/org', {
    method: 'POST',
    body: query,
    signal,
  });
  return {
    count: data.count,
    results: data.results.map((org: any) => ({
      ...org,
      timeCreated: new Date(org.timeCreated),
      members: org.members
        ? org.members.map((m: any) => ({
            ...m,
            timeCreated: new Date(m.timeCreated),
          }))
        : [],
    })),
  };
}
