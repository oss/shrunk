import base32 from 'hi-base32';
import { ResolveTicketInfo } from '../interfaces/tickets';

export async function getTicket(ticketId: string): Promise<any> {
  const response = await fetch(`/api/core/ticket/${base32.encode(ticketId)}`);
  const body = await response.json();
  return body;
}

export async function getEntityPosition(entity: string): Promise<any> {
  const response = await fetch(
    `/api/core/user/${base32.encode(entity)}/position`,
  );
  const body = await response.json();
  return body;
}

export async function closeTicket(ticketId: string): Promise<Response> {
  const resp = await fetch(`/api/core/ticket/${base32.encode(ticketId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'close',
    }),
  });

  return resp;
}

export async function getHelpDeskText(): Promise<any> {
  const response = await fetch('/api/core/ticket/text');
  const data = await response.json();
  return data;
}

// TODO: This is dangerous(?), people can exploit this and send as many emails as they want.
export async function sendTicketEmail(ticketId: string, category: string) {
  await fetch('/api/core/ticket/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: ticketId,
      category,
    }),
  });
}

export async function getTicketsResolvedCount(): Promise<number> {
  const response = await fetch(
    `/api/core/ticket?filter=status:resolved&count=true`,
  );
  const data = await response.json();
  return data.count as number;
}

export async function createTicket(
  reason: string,
  userComment: string,
  entity?: string,
) {
  const response = await fetch('/api/core/ticket', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason, entity, user_comment: userComment }),
  });
  return response;
}

export async function resolveTicket(
  ticketId: string,
  values: ResolveTicketInfo,
) {
  const response = await fetch(`/api/core/ticket/${base32.encode(ticketId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'resolve',
      ...values,
    }),
  });

  return response;
}

export async function getTickets(userPrivileges: Set<string>, netid: string) {
  let response = null;
  if (userPrivileges.has('admin')) {
    response = await fetch(
      `/api/core/ticket?filter=status:open&sort=-timestamp`,
    );
  } else {
    response = await fetch(
      `/api/core/ticket?filter=reporter:${netid},status:open&sort=-timestamp`,
    );
  }
  const body = await response.json();
  return body;
}
