import { CircleCheckIcon, CircleXIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  closeTicket,
  getEntityPosition,
  getHelpDeskText,
  getTicket,
} from '@/Api/Tickets';
import TicketDetails, { EntityDetails } from '@/Components/TicketDetails';
import ResolveTicketDrawer from '@/Drawers/ResolveTicketDrawer';
import { EntityPositionInfo, TicketInfo } from '@/Interfaces/Tickets';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
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
} from '@/Components/ui/alert-dialog';

interface Props {
  userPrivileges: Set<string>;
}

const Ticket: React.FC<Props> = ({ userPrivileges }) => {
  const { id: ticketID = '' } = useParams<{ id: string }>();
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [entityPositionInfo, setEntityPositionInfo] =
    useState<EntityPositionInfo | null>(null);
  const [helpDeskText, setHelpDeskText] = useState<Record<string, any> | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [closing, setClosing] = useState<boolean>(false);
  const [isResolveDrawerOpen, setIsResolveDrawerOpen] =
    useState<boolean>(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');

  const onGetEntityPosition = async (entity: string) => {
    const data = await getEntityPosition(entity);
    setEntityPositionInfo(data);
  };

  const onGetTicket = async () => {
    const data = await getTicket(ticketID);
    setTicketInfo(data);

    if (userPrivileges.has('admin') && data.entity) {
      await onGetEntityPosition(data.entity);
    }
  };

  const onCloseTicket = async () => {
    setClosing(true);
    const response = await closeTicket(ticketID);
    const data = await response.json();

    if (response.ok) {
      toast.success(data.message || 'Success');
      setClosing(false);
      navigate('/app/tickets');
    } else {
      toast.error(data.message || 'Error');
      setClosing(false);
    }
  };

  const onGetHelpDeskText = async () => {
    const data = await getHelpDeskText();
    setHelpDeskText(data);
  };

  useEffect(() => {
    const initComponent = async () => {
      switch (mode) {
        case 'resolve':
          setIsResolveDrawerOpen(true);
          break;
      }

      setLoading(true);
      const fetchPromises = [onGetHelpDeskText(), onGetTicket()];
      await Promise.all(fetchPromises);
      setLoading(false);
    };

    initComponent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <>
      {ticketInfo &&
        helpDeskText &&
        (entityPositionInfo || !ticketInfo.entity) && (
          <ResolveTicketDrawer
            open={isResolveDrawerOpen}
            ticketInfo={ticketInfo}
            entityPositionInfo={entityPositionInfo}
            helpDeskText={helpDeskText}
            onClose={() => setIsResolveDrawerOpen(false)}
          />
        )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="app-page-heading">Ticket {ticketID}</h1>
          <div className="flex gap-2">
            {userPrivileges.has('admin') && (
              <Button
                onClick={() => setIsResolveDrawerOpen(true)}
                disabled={ticketInfo?.status !== 'open'}
              >
                <CircleCheckIcon />
                Resolve
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={ticketInfo?.status !== 'open'}
                >
                  <CircleXIcon />
                  {closing ? 'Closing...' : 'Close'}
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
                  <AlertDialogAction onClick={onCloseTicket}>
                    Yes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              ) : ticketInfo && helpDeskText ? (
                <TicketDetails
                  helpDeskText={helpDeskText}
                  ticketInfo={ticketInfo}
                />
              ) : (
                <p className="text-muted-foreground italic">
                  Failed to load ticket details
                </p>
              )}
            </CardContent>
          </Card>
          {userPrivileges.has('admin') && ticketInfo?.entity && (
            <Card>
              <CardHeader>
                <CardTitle>Associated NetID Details</CardTitle>
              </CardHeader>
              <CardContent>
                {entityPositionInfo ? (
                  <EntityDetails entityPositionInfo={entityPositionInfo} />
                ) : (
                  <p className="text-muted-foreground">
                    Failed to load associated NetID position details
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default Ticket;
