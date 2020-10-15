export interface MemberInfo {
    is_admin: boolean;
    netid: string;
    timeCreated: Date;
}

export interface OrgInfo {
    id: string;
    name: string;
    members: MemberInfo[];
    timeCreated: Date;
    is_member: boolean;
    is_admin: boolean;
}

export const listOrgs = async (which: 'all' | 'user'): Promise<OrgInfo[]> => {
    const result = await fetch('/api/v1/org/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ which }),
    }).then(resp => resp.json());
    return result.orgs.map((org: any) => ({
        ...org,
        timeCreated: new Date(org.timeCreated),
        members: [],
    }));
}

export const getOrgInfo = async (id: string): Promise<OrgInfo> => {
    const result: any = await fetch(`/api/v1/org/${id}`).then(resp => resp.json());
    return {
        ...result,
        timeCreated: new Date(result.timeCreated),
        members: result.members.map((member: any) => ({
            ...member,
            timeCreated: new Date(member.timeCreated),
        }) as MemberInfo),
    };
}

export const createOrg = async (name: string): Promise<void> => {
    await fetch('/api/v1/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
    });
}

export const deleteOrg = async (id: string): Promise<void> => {
    await fetch(`/api/v1/org/${id}`, { method: 'DELETE' });
}
