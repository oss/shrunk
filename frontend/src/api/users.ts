import base32 from 'hi-base32';

export async function removeRoleFromUser(netid: string, role: string) {
  await fetch(`/api/core/user/roles`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      netid,
      role,
    }),
  });
}

export async function addRoleToUser(
  netid: string,
  role: string,
  comment?: string,
) {
  return fetch(`/api/core/user/roles`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role,
      comment,
      netid,
    }),
  });
}


export async function getAllUsers() {
  const response = await fetch('/api/core/user/all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  return data.users;
}

export async function createUser(
  netid: string,
  roles: string[],
  comment?: string,
) {
  return fetch(`/api/core/user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      netid,
      roles,
      comment,
    }),
  });
}

export async function removeUser(netid: string) {
  return fetch(`/api/core/user`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      netid,
    }),
  });
}
