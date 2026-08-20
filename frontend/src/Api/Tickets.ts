import base32 from 'hi-base32';
import { ResolveTicketInfo, TicketInfo } from '@/Interfaces/Tickets';
import { requestJson, requestVoid } from '@/Api/Client';

const jsonHeaders = { 'Content-Type': 'application/json' };

interface TicketActionResponse {
  message: string;
}

export async function getTicket(ticketId: string): Promise<TicketInfo> {
  return requestJson<TicketInfo>(`/api/core/ticket/${base32.encode(ticketId)}`);
}

export async function getEntityPosition(entity: string): Promise<any> {
  return requestJson(`/api/core/user/${base32.encode(entity)}/position`);
}

export async function closeTicket(
  ticketId: string,
): Promise<TicketActionResponse> {
  return requestJson<TicketActionResponse>(
    `/api/core/ticket/${base32.encode(ticketId)}`,
    {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ action: 'close' }),
    },
  );
}

export async function getHelpDeskText(): Promise<Record<string, any>> {
  return requestJson('/api/core/ticket/text');
}

export async function sendTicketEmail(
  ticketId: string,
  category: string,
): Promise<void> {
  await requestVoid('/api/core/ticket/email', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      id: ticketId,
      category,
    }),
  });
}

export async function getTicketsResolvedCount(): Promise<number> {
  const data = await requestJson<{ count: number }>(
    '/api/core/ticket?filter=status:resolved&count=true',
  );
  return data.count;
}

export async function createTicket(
  reason: string,
  userComment: string,
  entity?: string,
): Promise<{ message: string; ticket: TicketInfo }> {
  return requestJson('/api/core/ticket', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ reason, entity, user_comment: userComment }),
  });
}

export async function resolveTicket(
  ticketId: string,
  values: ResolveTicketInfo,
): Promise<TicketActionResponse> {
  return requestJson<TicketActionResponse>(
    `/api/core/ticket/${base32.encode(ticketId)}`,
    {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({
        action: 'resolve',
        ...values,
      }),
    },
  );
}

export async function getTickets(
  userPrivileges: Set<string>,
  netid: string,
): Promise<TicketInfo[]> {
  const url = userPrivileges.has('admin')
    ? '/api/core/ticket?filter=status:open&sort=-timestamp'
    : `/api/core/ticket?filter=reporter:${encodeURIComponent(netid)},status:open&sort=-timestamp`;
  return requestJson<TicketInfo[]>(url);
}
