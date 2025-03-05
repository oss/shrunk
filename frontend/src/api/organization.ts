import { Organization, OrganizationMember } from '../interfaces/organizations';

/**
 * @param which Whether to list all orgs or orgs of which the user is a member
 */
export async function getOrganizations(
  which: 'all' | 'user',
): Promise<Organization[]> {
  const result = await fetch('/api/v1/org/list', {
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
  const result: any = await fetch(`/api/v1/org/${id}`).then((resp) =>
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
  await fetch('/api/v1/org', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function deleteOrganization(id: string): Promise<void> {
  await fetch(`/api/v1/org/${id}`, { method: 'DELETE' });
}

export async function renameOrganization(id: string, newName: string) {
  await fetch(`/api/v1/org/${id}/rename/${newName}`, {
    method: 'PUT',
  });
}

export async function addMemberToOrganization(
  organizationId: string,
  netid: string,
) {
  await fetch(`/api/v1/org/${organizationId}/member/${netid}`, {
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
  await fetch(`/api/v1/org/${organizationId}/member/${netid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_admin: isAdmin }),
  });
}

export async function removeMemberFromOrganization(
  organizationId: string,
  netid: string,
) {
  await fetch(`/api/v1/org/${organizationId}/member/${netid}`, {
    method: 'DELETE',
  });
}
