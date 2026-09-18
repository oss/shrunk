/**
 * Implements the [[LookupTableHeader]] component
 * @packageDocumentation
 */

import { CloudDownloadIcon, PlusCircleIcon } from 'lucide-react';
import React from 'react';
import { useMutation } from '@tanstack/react-query';

import { createUser } from '@/Features/Admin/Api';
import SearchUser from '@/Features/Admin/SearchUser';
import { Button } from '@/Shared/ui/button';
import { Checkbox } from '@/Shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/Shared/ui/dialog';
import { Input } from '@/Shared/ui/input';
import { Label } from '@/Shared/ui/label';
import { Textarea } from '@/Shared/ui/textarea';
import { getErrorMessage } from '@/Shared/Lib/Http';

/**
 * Props for the [[LookupTableHeader]] component
 * @interface
 */
interface LookupTableHeaderProps {
  /**
   * Callback function to force rehydration of table data
   * @property
   */
  rehydrateData: () => void;

  /**
   * Callback used to initiate the export of the table's current data
   * @property
   */
  onExportClick: () => void;

  /**
   * Callback function to execute when the user searches for a user
   * @property
   */
  onSearch: (value: string) => void;
}

const roleOptions = [
  { value: 'whitelisted', label: 'Whitelisted' },
  { value: 'admin', label: 'Admin' },
  { value: 'powerUser', label: 'Power User' },
  { value: 'facultyStaff', label: 'Faculty/Staff' },
];

/**
 * The [[LookupTableHeader]] component serves as a collection of operations performed on/related to the user lookup table
 * @class
 */
const LookupTableHeader: React.FC<LookupTableHeaderProps> = ({
  onExportClick,
  rehydrateData,
  onSearch,
}) => {
  const [showCreateUserModal, setShowCreateUserModal] = React.useState(false);
  const [netid, setNetid] = React.useState('');
  const [roles, setRoles] = React.useState<string[]>([]);
  const [comment, setComment] = React.useState('');
  const [status, setStatus] = React.useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: ({
      user,
      assignedRoles,
      reason,
    }: {
      user: string;
      assignedRoles: string[];
      reason: string;
    }) => createUser(user, assignedRoles, reason),
    onSuccess: () => {
      setShowCreateUserModal(false);
      resetForm();
      rehydrateData();
    },
    onError: (error) =>
      setStatus(getErrorMessage(error, 'Failed to create user.')),
  });

  const resetForm = () => {
    setNetid('');
    setRoles([]);
    setComment('');
    setStatus(null);
  };

  const handleConfirm = () => {
    if (netid.trim() === '') {
      setStatus('Please input a NetID.');
      return;
    }

    if (roles.length === 0) {
      setStatus('Please select at least one role.');
      return;
    }

    const roleMapping: Record<string, string> = {
      whitelisted: 'whitelisted',
      admin: 'admin',
      powerUser: 'power_user',
      facultyStaff: 'facstaff',
    };
    createMutation.mutate({
      user: netid,
      assignedRoles: roles.map((role) => roleMapping[role]),
      reason: comment,
    });
  };

  const toggleRole = (role: string, checked: boolean) => {
    setRoles((currentRoles) =>
      checked
        ? [...currentRoles, role]
        : currentRoles.filter((currentRole) => currentRole !== role),
    );
    setStatus(null);
  };

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="w-full lg:w-[280px]">
          <SearchUser onSearch={onSearch} placeholder="Search for user" />
        </div>
        <div className="flex w-full justify-between gap-2 lg:w-auto">
          <Button variant="outline" onClick={onExportClick}>
            <CloudDownloadIcon />
            Export
          </Button>
          <Button
            aria-label="Add user"
            onClick={() => setShowCreateUserModal(true)}
          >
            <PlusCircleIcon />
            Add
          </Button>
        </div>
      </div>

      <Dialog
        open={showCreateUserModal}
        onOpenChange={(open) => {
          setShowCreateUserModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Add User
            </DialogTitle>
            <DialogDescription>
              Assign initial roles to a user by NetID.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lookup-netid">NetID</Label>
              <Input
                id="lookup-netid"
                value={netid}
                placeholder="NetID"
                onChange={(event) => {
                  setNetid(event.target.value);
                  setStatus(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {roleOptions.map((role) => (
                  <label
                    key={role.value}
                    className="flex items-center gap-2 text-sm leading-none font-medium text-foreground"
                  >
                    <Checkbox
                      aria-label={`Assign ${role.label} role`}
                      className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary dark:data-[state=checked]:border-primary dark:data-[state=checked]:bg-primary"
                      checked={roles.includes(role.value)}
                      onCheckedChange={(checked) => {
                        toggleRole(role.value, checked === true);
                      }}
                    />
                    {role.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lookup-comment">Comment</Label>
              <Textarea
                id="lookup-comment"
                value={comment}
                placeholder="Why is this user being assigned/revoked these roles?"
                rows={4}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>

            {status ? (
              <p className="text-sm text-muted-foreground">{status}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={createMutation.isPending}
              onClick={() => setShowCreateUserModal(false)}
            >
              Cancel
            </Button>
            <Button
              aria-label="Confirm add user"
              disabled={createMutation.isPending}
              onClick={handleConfirm}
            >
              {createMutation.isPending ? 'Creating…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LookupTableHeader;
