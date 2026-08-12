import { useEffect, useState } from 'react';

import { getOrganizations } from '@/api/organization';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LinkSharedWith } from '@/interfaces/link';
import { Organization } from '@/interfaces/organizations';

interface BulkTransferModalProps {
  visible: boolean;
  selectedCount: number;
  onOk: (owner: LinkSharedWith) => Promise<void>;
  onCancel: () => void;
}

export default function BulkTransferModal({
  visible,
  selectedCount,
  onOk,
  onCancel,
}: BulkTransferModalProps) {
  const [targetType, setTargetType] = useState<'netid' | 'org'>('netid');
  const [netid, setNetid] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    getOrganizations('user').then((orgs) => setOrganizations(orgs));
  }, [visible]);

  const validateNetId = async (value: string) => {
    if (value.trim() === '') {
      setValidationError('Please enter a valid NetID.');
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

  const selectedOwner =
    targetType === 'netid'
      ? ({ _id: netid, type: 'netid' } as const)
      : ({ _id: organizationId, type: 'org' } as const);

  const disableSubmit =
    loading ||
    (targetType === 'netid'
      ? netid.trim() === '' || validationError !== null
      : organizationId === '');

  const reset = () => {
    setNetid('');
    setOrganizationId('');
    setValidationError(null);
    setSubmitError(null);
    setLoading(false);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  const handleSubmit = async () => {
    if (targetType === 'netid') {
      const isValid = await validateNetId(netid);
      if (!isValid) return;
    }

    setLoading(true);
    setSubmitError(null);
    try {
      await onOk(selectedOwner);
      reset();
    } catch {
      setSubmitError('Failed to transfer selected links.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Selected Links</DialogTitle>
          <DialogDescription className="text-foreground/80">
            Choose the new owner for {selectedCount}{' '}
            {selectedCount === 1 ? 'link' : 'links'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs
            value={targetType}
            onValueChange={(value) => {
              setTargetType(value as 'netid' | 'org');
              setValidationError(null);
              setSubmitError(null);
            }}
          >
            <TabsList>
              <TabsTrigger value="netid">NetID</TabsTrigger>
              <TabsTrigger value="org">Organization</TabsTrigger>
            </TabsList>
            <TabsContent value="netid" className="hidden" />
            <TabsContent value="org" className="hidden" />
          </Tabs>

          {targetType === 'netid' ? (
            <div className="space-y-2">
              <Label htmlFor="bulk-transfer-netid">NetID</Label>
              <Input
                id="bulk-transfer-netid"
                value={netid}
                onBlur={() => validateNetId(netid)}
                onChange={(event) => {
                  setNetid(event.target.value);
                  setValidationError(null);
                  setSubmitError(null);
                }}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select
                value={organizationId}
                onValueChange={(value) => {
                  setOrganizationId(value);
                  setSubmitError(null);
                }}
              >
                <SelectTrigger
                  aria-label="Transfer organization"
                  className="text-foreground data-[placeholder]:text-foreground"
                >
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {validationError ? (
            <p className="text-sm text-destructive">{validationError}</p>
          ) : null}
          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
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
                  This will transfer ownership of {selectedCount}{' '}
                  {selectedCount === 1 ? 'link' : 'links'}.
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
}
