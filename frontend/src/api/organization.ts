import { Organization, OrganizationMember } from '../interfaces/organizations';

/**
 * @param which Whether to list all orgs or orgs of which the user is a member
 */
export async function getOrganizations(
  which: 'all' | 'user',
): Promise<Organization[]> {
  const result = await fetch('/api/core/org/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ which }),
  }).then((resp) => resp.json());
  return result.orgs.map((org: any) => ({
    ...org,
    timeCreated: new Date(org.timeCreated),
    members: [],
  }));
}

export async function getOrganization(id: string): Promise<Organization> {
  const result: any = await fetch(`/api/core/org/${id}`).then((resp) =>
    resp.json(),
  );
  return {
    ...result,
    timeCreated: new Date(result.timeCreated),
    members: result.members.map(
      (member: any) =>
        ({
          ...member,
          timeCreated: new Date(member.timeCreated),
        } as OrganizationMember),
    ),
  };
}

export async function createOrg(name: string): Promise<void> {
  const res = await fetch('/api/core/org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new Error('Failed to create organization');
  }
}

export async function hasAssociatedUrls(id: string): Promise<boolean> {
  const res = await fetch(`/api/core/org/${id}/hasAssociatedUrls`, {
    method: 'GET',
  });
  const data = await res.json();
  return data.hasAssociatedUrls;
}

export async function deleteOrganization(id: string): Promise<void> {
  await fetch(`/api/core/org/${id}`, { method: 'DELETE' });
}

export async function renameOrganization(id: string, newName: string) {
  await fetch(`/api/core/org/${id}/rename/${newName}`, {
    method: 'PUT',
  });
}

export async function addMemberToOrganization(
  organizationId: string,
  netid: string,
) {
  await fetch(`/api/core/org/${organizationId}/member/${netid}`, {
    method: 'PUT',
  });
}

/**
 * Make someone an admin or not.
 */
export async function setAdminStatusOrganization(
  organizationId: string,
  netid: string,
  isAdmin: boolean,
) {
  await fetch(`/api/core/org/${organizationId}/member/${netid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_admin: isAdmin }),
  });
}

export async function removeMemberFromOrganization(
  organizationId: string,
  netid: string,
) {
  await fetch(`/api/core/org/${organizationId}/member/${netid}`, {
    method: 'DELETE',
  });
}

export async function getOrganizationVisits(organizationId: string) {
  const resp = await fetch(`/api/core/org/${organizationId}/stats/visits`);
  const data = resp.json();

  return data as any;
}

export async function getValidAccessTokenPermissions() {
  const resp = await fetch(`/api/core/org/valid-permissions`);
  const data = await resp.json();

  return data.permissions as string[];
}

export async function generateAccessToken(
  organizationId: string,
  title: string,
  description: string,
  permissions: string,
): Promise<string> {
  const resp = await fetch(`/api/core/org/${organizationId}/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title,
      description,
      permissions,
    }),
  });
  const data = await resp.json();
  return data.access_token;
}

export async function getAccessTokens(organizationId: string) {
  const resp = await fetch(`/api/core/org/${organizationId}/access_token`, {
    method: 'GET',
  });
  const data = await resp.json();
  return data.tokens;
}

export async function disableToken(tokenId: string): Promise<void> {
  await fetch(`/api/core/org/access_token/${tokenId}`, { method: 'PATCH' });
}

export async function deleteToken(tokenId: string): Promise<void> {
  await fetch(`/api/core/org/access_token/${tokenId}`, { method: 'DELETE' });
}
