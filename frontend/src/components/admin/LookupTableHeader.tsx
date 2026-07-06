/**
 * Implements the [[LookupTableHeader]] component
 * @packageDocumentation
 */

import { CloudDownloadIcon, PlusCircleIcon } from 'lucide-react';
import React from 'react';

import { createUser } from '@/api/users';
import SearchUser from '@/components/admin/SearchUser';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Textarea } from '@/components/ui/textarea';
import {
  adminDialogContentClass,
  adminDialogDescriptionClass,
  adminDialogLabelClass,
  adminInputClass,
  adminOutlineButtonClass,
  adminPrimaryButtonClass,
  adminSearchIconClass,
  adminTextareaClass,
} from '@/lib/admin-styles';

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

  const resetForm = () => {
    setNetid('');
    setRoles([]);
    setComment('');
    setStatus(null);
  };

  const handleConfirm = async () => {
    if (netid.trim() === '') {
      setStatus('Please input a NetID.');
      return;
    }

    if (roles.length === 0) {
      setStatus('Please select at least one role.');
      return;
    }

    try {
      const roleMapping: { [key: string]: string } = {
        whitelisted: 'whitelisted',
        admin: 'admin',
        powerUser: 'power_user',
        facultyStaff: 'facstaff',
      };
      const backendRoles = roles.map((role: string) => roleMapping[role]);
      const response = await createUser(netid, backendRoles, comment);

      if (!response.ok) {
        setStatus('Failed to create user.');
        return;
      }

      setStatus('User created successfully.');
      setShowCreateUserModal(false);
      resetForm();
      rehydrateData();
    } catch (error) {
      setStatus(`Failed to assign user roles ${error}`);
    }
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
          <SearchUser
            onSearch={onSearch}
            placeholder="Search for user"
            inputClassName={adminInputClass}
            iconClassName={adminSearchIconClass}
          />
        </div>
        <div className="flex w-full justify-between gap-2 lg:w-auto">
          <Button
            variant="outline"
            className={adminOutlineButtonClass}
            onClick={onExportClick}
          >
            <CloudDownloadIcon />
            Export
          </Button>
          <Button
            className={adminPrimaryButtonClass}
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
        <DialogContent className={adminDialogContentClass}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground dark:text-[#efefef]">
              Add User
            </DialogTitle>
            <DialogDescription className={adminDialogDescriptionClass}>
              Assign initial roles to a user by NetID.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lookup-netid" className={adminDialogLabelClass}>
                NetID
              </Label>
              <Input
                id="lookup-netid"
                value={netid}
                placeholder="NetID"
                className={adminInputClass}
                onChange={(event) => {
                  setNetid(event.target.value);
                  setStatus(null);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className={adminDialogLabelClass}>Roles</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {roleOptions.map((role) => (
                  <label
                    key={role.value}
                    className="flex items-center gap-2 text-sm leading-none font-medium text-foreground dark:text-[#efefef]"
                  >
                    <Checkbox
                      className="border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary dark:border-white/16 dark:data-[state=checked]:border-[#d21524] dark:data-[state=checked]:bg-[#d21524]"
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
              <Label htmlFor="lookup-comment" className={adminDialogLabelClass}>
                Comment
              </Label>
              <Textarea
                id="lookup-comment"
                value={comment}
                placeholder="Why is this user being assigned/revoked these roles?"
                rows={4}
                className={adminTextareaClass}
                onChange={(event) => setComment(event.target.value)}
              />
            </div>

            {status ? (
              <p className="text-sm text-muted-foreground dark:text-[#a9a9a9]">
                {status}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className={adminOutlineButtonClass}
              onClick={() => setShowCreateUserModal(false)}
            >
              Cancel
            </Button>
            <Button className={adminPrimaryButtonClass} onClick={handleConfirm}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LookupTableHeader;
