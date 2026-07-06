/* eslint-disable no-restricted-globals */

// TODO: Scheduled for deletion. See: https://gitlab.rutgers.edu/MaCS/OSS/shrunk/-/issues/277

import dayjs from 'dayjs';
import { CheckIcon, XIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Data describing a pending access request
 * @interface
 */
export interface PendingRequest {
  /**
   * ID of the link to which access has been requested
   * @property
   */
  link_id: string;

  /**
   * Title of the link
   * @property
   */
  title: string;

  /**
   * The request token, used to identify the request to the server
   * @property
   */
  request_token: string;

  /**
   * The NetID that made the request
   * @property
   */
  requesting_netid: string;

  /**
   * The time at which the request was made
   * @property
   */
  request_time: Date;
}

/**
 * The [[PendingRequestRow]] component displays one row in the pending requests list
 * @param props Props
 */
const PendingRequestRow: React.FC<{
  singletonRow: boolean;
  request: PendingRequest;
  onAccept: (request_token: string) => Promise<void>;
  onDeny: (request_token: string) => Promise<void>;
}> = (props) => {
  const { request } = props;
  return (
    <div
      className={
        props.singletonRow
          ? 'flex items-start justify-between gap-4 py-2'
          : 'flex items-start justify-between gap-4 border-b py-4 last:border-b-0'
      }
    >
      <div className="space-y-1">
        <p>
          <span className="font-bold">{request.requesting_netid}</span> has
          requested access to edit &ldquo;{request.title}&rdquo;
        </p>
        <p className="text-sm text-muted-foreground uppercase">
          Requested at{' '}
          {dayjs(request.request_time).format('MMMM D, YYYY h:mm a')}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          aria-label="Accept request"
          size="icon"
          variant="ghost"
          onClick={async (_ev) => props.onAccept(request.request_token)}
        >
          <CheckIcon />
        </Button>
        <Button
          aria-label="Deny request"
          size="icon"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={async (_ev) => props.onDeny(request.request_token)}
        >
          <XIcon />
        </Button>
      </div>
    </div>
  );
};

/**
 * Props for the [[PendingRequests]] component
 * @interface
 */
export interface Props {}

/**
 * State for the [[PendingRequests]] component
 * @interface
 */
interface State {
  /**
   * List of pending requests, or null
   * @property
   */
  pendingRequests: Array<PendingRequest> | null;

  /**
   * True if the modal has been closed by the user
   * @property
   */
  hidden: boolean;
}

/**
 * The [[PendingRequests]] component is responsible for displaying a list
 * of pending requests to the user and allowing them to accept or deny the requests
 * @class
 */
export class PendingRequests extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      pendingRequests: null,
      hidden: false,
    };
  }

  async componentDidMount(): Promise<void> {
    await this.updatePendingRequests();
  }

  /**
   * Fetch the list of pending requests from the server
   * @method
   */
  updatePendingRequests = async (): Promise<void> => {
    const pendingRequests = await fetch('/api/core/request/pending').then(
      (resp) => resp.json(),
    );
    this.setState({
      pendingRequests: pendingRequests.requests.map((req: any) => ({
        ...req,
        request_time: new Date(req.request_time),
      })),
    });
  };

  /**
   * Execute API requests to accept a request
   * @method
   * @param request_token The request token
   */
  acceptRequest = async (request_token: string): Promise<void> => {
    await fetch(`/api/core/request/resolve/${request_token}/accept`);
    await this.updatePendingRequests();
  };

  /**
   * Execute API requests to deny a request
   * @method
   * @param request_token The request token
   */
  denyRequest = async (request_token: string): Promise<void> => {
    await fetch(`/api/core/request/resolve/${request_token}/deny`);
    await this.updatePendingRequests();
  };

  render(): React.ReactNode {
    if (this.state.pendingRequests === null) {
      return <></>;
    }

    return (
      <Dialog
        open={!this.state.hidden && this.state.pendingRequests.length > 0}
        onOpenChange={(open) => {
          if (!open) {
            this.setState({ hidden: true });
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You have pending access requests</DialogTitle>
          </DialogHeader>
          {this.state.pendingRequests.map((request) => (
            <PendingRequestRow
              singletonRow={this.state.pendingRequests!.length === 1}
              key={request.request_token}
              request={request}
              onAccept={this.acceptRequest}
              onDeny={this.denyRequest}
            />
          ))}
        </DialogContent>
      </Dialog>
    );
  }
}
