import React, { useState } from 'react';
import { toast } from 'sonner';
import { CreateTicketInfo, TicketInfo } from '@/Interfaces/Tickets';
import { createTicket, sendTicketEmail } from '@/Api/Tickets';
import { getErrorMessage } from '@/Api/Client';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/Components/ui/sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  helpDeskText: Record<string, any>;
  setTickets: React.Dispatch<React.SetStateAction<TicketInfo[]>>;
}

const CreateTicketDrawer: React.FC<Props> = ({
  open,
  onClose,
  helpDeskText,
  setTickets,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [reasonField, setReasonField] = useState<string>('');
  const [entity, setEntity] = useState('');
  const [comment, setComment] = useState('');

  const isDev = import.meta.env.DEV;

  const resetForm = () => {
    setReasonField('');
    setEntity('');
    setComment('');
  };

  const validateEntity = (value: string): string | null => {
    const devUsers = ['DEV_USER', 'DEV_FACSTAFF', 'DEV_PWR_USER', 'DEV_ADMIN'];
    if (
      value &&
      !/^[a-zA-Z0-9]+$/.test(value) &&
      (!isDev || !devUsers.includes(value))
    ) {
      return 'NetID must be alphanumeric';
    }
    return null;
  };

  const validateComment = (value: string): string | null => {
    if (value && value.includes('\n')) {
      return 'Comment cannot contain a newline character';
    }
    return null;
  };

  const onCreateTicket = async (
    values: CreateTicketInfo,
  ): Promise<TicketInfo | null> => {
    setSubmitting(true);
    try {
      const data = await createTicket(
        values.reason,
        values.user_comment,
        values.entity,
      );
      setTickets((tickets) => [data.ticket, ...tickets]);
      toast.success(data.message || 'Ticket created successfully');
      return data.ticket;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to create the ticket.'));
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async () => {
    if (!reasonField) {
      toast.error('Please select a reason');
      return;
    }

    const entityError = validateEntity(entity);
    if (entityError) {
      toast.error(entityError);
      return;
    }

    const commentError = validateComment(comment);
    if (commentError) {
      toast.error(commentError);
      return;
    }

    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    const values: CreateTicketInfo = {
      reason: reasonField,
      user_comment: comment,
      entity: reasonField === 'whitelisted' ? entity : undefined,
    };

    const ticket = await onCreateTicket(values);
    if (!ticket) {
      return;
    }

    try {
      await sendTicketEmail(ticket._id, 'confirmation');
      await sendTicketEmail(ticket._id, 'notification');
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          'The ticket was created, but its notification email could not be sent.',
        ),
      );
    }

    resetForm();
    onClose();
  };

  const handleReasonChange = (newReason: string) => {
    setReasonField(newReason);
    setEntity('');
    setComment('');
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-[720px]">
        <SheetHeader>
          <SheetTitle>New Ticket</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ticket-reason">Reason</Label>
            <Select value={reasonField} onValueChange={handleReasonChange}>
              <SelectTrigger id="ticket-reason">
                <SelectValue placeholder="Select a reason for the ticket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="ticket-reason-power-user" value="power_user">
                  Grant me the power user role
                </SelectItem>
                <SelectItem id="ticket-reason-whitelisted" value="whitelisted">
                  Whitelist another person to Go services
                </SelectItem>
                <SelectItem id="ticket-reason-other" value="other">
                  Other
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reasonField && (
            <p className="contents text-sm text-foreground">
              {helpDeskText.reason[reasonField].prompt}
            </p>
          )}

          {reasonField === 'whitelisted' && (
            <div className="space-y-2">
              <Label htmlFor="ticket-entity">Associated NetID</Label>
              <Input
                id="ticket-entity"
                placeholder="NetID of the person you want to whitelist"
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                maxLength={10}
              />
            </div>
          )}

          {reasonField && (
            <>
              <div className="space-y-2">
                <Label htmlFor="ticket-comment">Comment</Label>
                <Textarea
                  id="ticket-comment"
                  rows={4}
                  placeholder={
                    helpDeskText.reason[reasonField]?.placeholder || ''
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={300}
                />
              </div>
              <Button
                aria-label="Submit ticket"
                onClick={handleFormSubmit}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CreateTicketDrawer;
