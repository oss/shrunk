import { useState } from 'react';

import { serverValidateNetId } from '@/api/validators';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ITransferModal {
  visible: boolean;
  onOk: (netid: string, link_id: string) => Promise<void>;
  onCancel: () => void;
  link_id: string;
}

const TransferToNetIdModal = (props: ITransferModal) => {
  const [loading, setLoading] = useState(false);
  const [netId, setNetId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const disableSubmit =
    loading || netId.trim() === '' || validationError !== null;

  const validateNetId = async (value: string) => {
    if (value.trim() === '') {
      setValidationError(null);
      return false;
    }

    try {
      await serverValidateNetId(null, value);
      setValidationError(null);
      return true;
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Invalid NetID',
      );
      return false;
    }
  };

  const handleSubmit = async () => {
    const isValid = await validateNetId(netId);
    if (!isValid) return;

    setLoading(true);
    setSubmitError(null);
    try {
      await props.onOk(netId, props.link_id);
      setNetId('');
      setValidationError(null);
    } catch {
      setSubmitError('Failed to transfer ownership.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    props.onCancel();
  };

  return (
    <Dialog open={props.visible} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer to NetID</DialogTitle>
          <DialogDescription>
            Enter the NetID that should become the new owner of this link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="transfer-netid">NetID</Label>
          <Input
            id="transfer-netid"
            value={netId}
            onBlur={() => validateNetId(netId)}
            onChange={(event) => {
              setNetId(event.target.value);
              setValidationError(null);
              setSubmitError(null);
            }}
          />
          {validationError ? (
            <p className="text-sm text-destructive">{validationError}</p>
          ) : null}
          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={props.onCancel}>
            Cancel
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={disableSubmit}>
                {loading ? 'Transferring...' : 'Confirm Transfer'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Transfer ownership?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will transfer ownership of the link to {netId}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleSubmit}
                >
                  Yes, transfer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransferToNetIdModal;
