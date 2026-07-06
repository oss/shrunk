import React from 'react';
import { toast } from 'sonner';
import { useHistory } from 'react-router-dom';
import TicketDetails, { EntityDetails } from '@/components/TicketDetails';
import {
  EntityPositionInfo,
  ResolveTicketInfo,
  TicketInfo,
} from '@/interfaces/tickets';
import { resolveTicket, sendTicketEmail } from '@/api/tickets';
import { addRoleToUser } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Props {
  open: boolean;
  ticketInfo: TicketInfo;
  entityPositionInfo: EntityPositionInfo | null;
  helpDeskText: Record<string, any>;
  onClose: () => void;
}

const ResolveTicketDrawer: React.FC<Props> = ({
  open,
  ticketInfo,
  entityPositionInfo,
  helpDeskText,
  onClose,
}) => {
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [adminReview, setAdminReview] = React.useState('');
  const [isRoleGranted, setIsRoleGranted] = React.useState(false);
  const history = useHistory();

  const onResolveTicket = async (values: ResolveTicketInfo) => {
    setSubmitting(true);
    const response = await resolveTicket(ticketInfo._id, values);
    const data = await response.json();

    if (response.ok) {
      toast.success(data.message || 'Success');
      setSubmitting(false);
      history.push('/tickets');
    } else {
      toast.error(data.message || 'Error');
      setSubmitting(false);
    }
  };

  const grantRole = async (entity: string, role: string, comment?: string) => {
    await addRoleToUser(entity, role, comment);
  };

  const handleFormSubmit = async () => {
    const values: ResolveTicketInfo = {
      admin_review: adminReview,
      is_role_granted: isRoleGranted,
    };

    await onResolveTicket(values);

    if (values.is_role_granted && ticketInfo?.entity) {
      await grantRole(
        ticketInfo.entity,
        ticketInfo.reason,
        values.admin_review,
      );
    }

    await sendTicketEmail(ticketInfo._id, 'resolution');
  };

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-[720px]">
        <SheetHeader>
          <SheetTitle>Resolve Ticket</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <TicketDetails helpDeskText={helpDeskText} ticketInfo={ticketInfo} />
          {entityPositionInfo && (
            <EntityDetails entityPositionInfo={entityPositionInfo} />
          )}
          <hr className="border-border" />
          <div className="space-y-2">
            <Label htmlFor="resolve-comment">Comment</Label>
            <Textarea
              id="resolve-comment"
              rows={4}
              placeholder="Enter a comment"
              value={adminReview}
              onChange={(e) => setAdminReview(e.target.value)}
            />
          </div>
          {(ticketInfo.reason === 'whitelisted' ||
            ticketInfo.reason === 'power_user') && (
            <div className="space-y-2">
              <Label>Decision</Label>
              <RadioGroup
                value={String(isRoleGranted)}
                onValueChange={(val) => setIsRoleGranted(val === 'true')}
                className="flex gap-2"
              >
                <RadioGroupItem value="true" id="resolve-approve" />
                <Label htmlFor="resolve-approve">Approve</Label>
                <RadioGroupItem value="false" id="resolve-deny" />
                <Label htmlFor="resolve-deny">Deny</Label>
              </RadioGroup>
            </div>
          )}
          <Button onClick={handleFormSubmit} disabled={submitting}>
            {submitting ? 'Resolving...' : 'Resolve'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ResolveTicketDrawer;
