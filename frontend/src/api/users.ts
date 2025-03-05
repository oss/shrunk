import base32 from 'hi-base32';

export async function removeRoleFromUser(netid: string, role: string) {
  const encodedNetId = base32.encode(netid);
  await fetch(`/api/v1/role/${role}/entity/${encodedNetId}`, {
    method: 'DELETE',
  });
}

export async function addRoleToUser(
  netid: string,
  role: string,
  comment?: string,
) {
  const encodedNetId = base32.encode(netid);
  return fetch(`/api/v1/role/${role}/entity/${encodedNetId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comment,
    }),
  });
}
