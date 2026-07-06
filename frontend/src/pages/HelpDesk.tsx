import dayjs from 'dayjs';
import {
  CircleCheckIcon,
  CirclePlusIcon,
  CircleXIcon,
  EyeIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  closeTicket,
  getHelpDeskText,
  getTickets,
  getTicketsResolvedCount,
} from '@/api/tickets';
import CreateTicketDrawer from '@/drawers/CreateTicketDrawer';
import { TicketInfo } from '@/interfaces/tickets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  netid: string;
  userPrivileges: Set<string>;
}

const HelpDesk: React.FC<Props> = ({ netid, userPrivileges }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [helpDeskText, setHelpDeskText] = useState<Record<string, any> | null>(
    null,
  );
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [numTicketsResolved, setNumTicketsResolved] = useState<number>(0);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const onGetHelpDeskText = async () => {
    const data = await getHelpDeskText();
    setHelpDeskText(data);
  };

  const getNumTicketsResolved = async () => {
    setNumTicketsResolved(await getTicketsResolvedCount());
  };

  const onGetTickets = async () => {
    setTickets(await getTickets(userPrivileges, netid));
  };

  const onCloseTicket = async (ticketID: string) => {
    const response = await closeTicket(ticketID);

    if (response.ok) {
      setTickets(tickets.filter((ticket) => ticket._id !== ticketID));
      toast.success('Ticket closed successfully');
    } else {
      toast.error('Failed to close ticket');
    }
  };

  useEffect(() => {
    const initComponent = async () => {
      setLoading(true);
      const fetchPromises = [onGetHelpDeskText(), onGetTickets()];

      if (userPrivileges.has('admin')) {
        fetchPromises.push(getNumTicketsResolved());
      }

      await Promise.all(fetchPromises);
      setLoading(false);
    };

    initComponent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderEntity = (entity: string | undefined) => {
    if (!entity) {
      return <span className="italic">N/A</span>;
    }
    if (entity === netid) {
      return (
        <span>
          {netid} <span className="italic">(self)</span>
        </span>
      );
    }
    return <span>{entity}</span>;
  };

  const isAdmin = userPrivileges.has('admin');
  const startIndex = isAdmin ? (page - 1) * pageSize : 0;
  const paginatedTickets = isAdmin
    ? tickets.slice(startIndex, startIndex + pageSize)
    : tickets;
  const totalPages = Math.ceil(tickets.length / pageSize);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const reasonCell = (reason: string) =>
    helpDeskText ? helpDeskText.reason[reason].name : 'Failed to load reason';

  const renderActions = (record: TicketInfo) => (
    <div className="flex justify-end gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" asChild>
            <a href={`/app/tickets/${record._id}`}>
              <EyeIcon />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>View</TooltipContent>
      </Tooltip>
      {userPrivileges.has('admin') && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <a href={`/app/tickets/${record._id}?mode=resolve`}>
                <CircleCheckIcon />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Resolve</TooltipContent>
        </Tooltip>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <CircleXIcon />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to close this ticket?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={() => onCloseTicket(record._id)}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="app-page-heading">Help Desk</h1>
          {!isAdmin && (
            <Button onClick={() => setIsCreateDrawerOpen(true)}>
              <CirclePlusIcon />
              New Ticket
            </Button>
          )}
        </div>

        {isAdmin && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Open Tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <div className="text-2xl font-bold">{tickets.length}</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tickets Resolved
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <div className="text-2xl font-bold">{numTicketsResolved}</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {isAdmin ? (
                  <>
                    <TableHead>Time Created</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Associated NetID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>Reason</TableHead>
                    <TableHead>Associated NetID</TableHead>
                    <TableHead className="w-[40%]">Comment</TableHead>
                    <TableHead>Time Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedTickets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No open tickets
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTickets.map((ticket) => (
                  <TableRow key={ticket._id}>
                    {isAdmin ? (
                      <>
                        <TableCell>
                          {dayjs(new Date(ticket.created_time * 1000)).format(
                            'MMM D, YYYY, h:mm a',
                          )}
                        </TableCell>
                        <TableCell>{ticket.reporter}</TableCell>
                        <TableCell>{reasonCell(ticket.reason)}</TableCell>
                        <TableCell>{renderEntity(ticket.entity)}</TableCell>
                        <TableCell className="text-right">
                          {renderActions(ticket)}
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{reasonCell(ticket.reason)}</TableCell>
                        <TableCell>{renderEntity(ticket.entity)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {ticket.user_comment}
                        </TableCell>
                        <TableCell>
                          {dayjs(new Date(ticket.created_time * 1000)).format(
                            'MMM D, YYYY, h:mm a',
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {renderActions(ticket)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {isAdmin && tickets.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <select
                className="rounded border bg-background px-2 py-1 text-sm"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-muted-foreground">
              {startIndex + 1}-{Math.min(startIndex + pageSize, tickets.length)}{' '}
              of {tickets.length}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {helpDeskText && (
          <CreateTicketDrawer
            open={isCreateDrawerOpen}
            onClose={() => setIsCreateDrawerOpen(false)}
            helpDeskText={helpDeskText}
            setTickets={setTickets}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default HelpDesk;
