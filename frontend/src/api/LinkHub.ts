import NotFoundException from '../exceptions/NotFoundException';

export async function getLinkHub(linkhubId: string): Promise<any> {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/private`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (resp.status === 404 || resp.status === 401) {
    throw new NotFoundException('LinkHub does not exist');
  }

  const result = await resp.json();

  return result;
}

export async function addLinkToLinkHub(
  linkhubId: string,
  title: string,
  url: string,
) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/add-element`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      url,
    }),
  });
  const result = await resp.json();

  return result;
}

export async function setLinkFromLinkHub(
  linkhubId: string,
  index: number,
  title: string,
  url: string,
) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/set-element`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      url,
      index,
    }),
  });
  const result = await resp.json();

  return result;
}

export async function changeLinkHubTitle(linkhubId: string, title: string) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
    }),
  });
  const result = await resp.json();

  return result;
}

export async function deleteLinkAtIndex(linkhubId: string, index: number) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/element`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      index,
    }),
  });
  const result = await resp.json();

  return result;
}

export async function changeLinkHubAlias(linkhubId: string, alias: string) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/alias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alias,
    }),
  });
  const result = await resp.json();

  return result;
}

export async function publishLinkHub(linkhubId: string, value: boolean) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      value,
    }),
  });
  const result = await resp.json();

  return result['publish-status'];
}

export async function deleteLinkHub(linkhubId: string) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}`, {
    method: 'DELETE',
  });
  const result = await resp.json();

  return result;
}

export async function addCollaboratorToBackend(
  linkhubId: string,
  identifier: string,
  permission: string,
  type: 'netid' | 'org',
) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier,
      permission,
      type,
    }),
  });
  const result = await resp.json();

  return result;
}

export async function removeCollaboratorToBackend(
  linkhubId: string,
  identifier: string,
  type: 'netid' | 'org',
) {
  const resp = await fetch(`/api/v1/linkhub/${linkhubId}/share`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier,
      type,
    }),
  });
  const result = await resp.json();

  return result;
}
