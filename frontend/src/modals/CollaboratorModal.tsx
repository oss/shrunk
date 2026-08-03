import { PlusCircleIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { getOrganizations } from '@/api/organization';
import { serverValidateGuest, serverValidateNetId } from '@/api/validators';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Organization } from '@/interfaces/organizations';
import { ButtonGroup } from '@/components/ui/button-group';

export interface Collaborator {
  _id: string;
  type: 'netid' | 'org';
  role?: string;
  org_name?: string;
}

interface ICollaboratorModal {
  visible: boolean;
  people: Array<Collaborator>;
  _id: string;
  // The first role should be the MASTER role (owner or admin),
  // while the second must be the DEFAULT role.
  roles: Array<{ value: string; label: string }>;

  onAddEntity: (activeTab: 'netid' | 'org', value: Collaborator) => void;
  onChangeEntity: (
    activeTab: 'netid' | 'org',
    value: Collaborator,
    newRole: string,
  ) => void;
  onRemoveEntity: (activeTab: 'netid' | 'org', value: Collaborator) => void;
  onOk: () => void;
  onCancel: () => void;

  multipleMasters?: boolean;
  canAssignMasterRole?: boolean;

  onlyActiveTab?: 'netid' | 'org';
}

const collaboratorControlBorderClass = 'border border-border';

export default function CollaboratorModal(props: ICollaboratorModal) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [collaboratorRole, setCollaboratorRole] = useState<string>(
    props.roles[1].value,
  );
  const [activeTab, setActiveTab] = useState<'netid' | 'org'>(
    props.onlyActiveTab ?? 'netid',
  );
  const [netid, setNetid] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const masterRole = props.roles[0].value;

  useEffect(() => {
    getOrganizations('user').then((orgs) => setOrganizations(orgs));
  }, []);

  useEffect(() => {
    if (props.onlyActiveTab) {
      setActiveTab(props.onlyActiveTab);
    }
  }, [props.onlyActiveTab]);

  const sortedPeople = useMemo(() => {
    const permissionOrder: { [key: string]: number } = {};
    props.roles.forEach((role, index) => {
      permissionOrder[role.value] = index;
    });

    return [...props.people].sort((a: Collaborator, b: Collaborator) => {
      if (a.role === undefined || b.role === undefined) {
        throw new Error('Collaborator must have a role');
      }
      return permissionOrder[a.role] - permissionOrder[b.role];
    });
  }, [props.people, props.roles]);

  const mastersCount = props.people.filter(
    (entity) => entity.role === masterRole,
  ).length;

  const canAddMaster = props.multipleMasters || mastersCount === 0;
  const canDemoteMaster = props.multipleMasters && mastersCount > 1;
  const canAssignMasterRole = props.canAssignMasterRole ?? true;

  const validateNetId = async (value: string) => {
    if (value.trim() === '') {
      return false;
    }

    try {
      if (collaboratorRole === 'guest') {
        await serverValidateGuest(null, value);
      } else {
        await serverValidateNetId(null, value);
      }
      setValidationError(null);
      return true;
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Invalid NetID',
      );
      return false;
    }
  };

  const handleAddEntity = async () => {
    if (activeTab === 'netid') {
      const isValid = await validateNetId(netid);
      if (!isValid) return;

      props.onAddEntity(activeTab, {
        _id: netid,
        type: activeTab,
        role: collaboratorRole,
      });
      setNetid('');
      return;
    }

    if (organizationId === '') {
      setValidationError('Please select an organization.');
      return;
    }

    props.onAddEntity(activeTab, {
      _id: organizationId,
      type: activeTab,
      role: collaboratorRole,
    });
    setOrganizationId('');
    setValidationError(null);
  };

  const availableTabs = [
    ...(['netid', undefined].includes(props.onlyActiveTab) ? ['netid'] : []),
    ...(['org', undefined].includes(props.onlyActiveTab) ? ['org'] : []),
  ] as Array<'netid' | 'org'>;

  return (
    <Dialog
      open={props.visible}
      onOpenChange={(open) => {
        if (!open) {
          // setValidationError(null);
          props.onCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Collaborate</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              {activeTab === 'netid' ? (
                <Input
                  value={netid}
                  placeholder="Search by NetID"
                  className={collaboratorControlBorderClass}
                  onBlur={() => validateNetId(netid)}
                  onChange={(event) => {
                    setNetid(event.target.value);
                    setValidationError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleAddEntity();
                    }
                  }}
                />
              ) : (
                <Select
                  value={organizationId}
                  onValueChange={(value) => {
                    setOrganizationId(value);
                    setValidationError(null);
                  }}
                >
                  <SelectTrigger className={collaboratorControlBorderClass}>
                    <SelectValue placeholder="Your Organizations" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <ButtonGroup>
              <Select
                value={collaboratorRole}
                onValueChange={setCollaboratorRole}
              >
                <SelectTrigger
                  className={`w-24 pr-2 ${collaboratorControlBorderClass}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {props.roles.map((role) => (
                    <SelectItem
                      key={role.value}
                      value={role.value}
                      disabled={
                        role.value === masterRole &&
                        (!canAddMaster || !canAssignMasterRole)
                      }
                    >
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddEntity}>
                <PlusCircleIcon />
                Add
              </Button>
            </ButtonGroup>
          </div>
          {validationError ? (
            <p className="text-sm text-destructive">{validationError}</p>
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'netid' | 'org')}
          >
            <TabsList>
              {availableTabs.includes('netid') && (
                <TabsTrigger value="netid">People</TabsTrigger>
              )}
              {availableTabs.includes('org') && (
                <TabsTrigger value="org">Organizations</TabsTrigger>
              )}
            </TabsList>
          </Tabs>

          <div className="space-y-3">
            {sortedPeople
              .filter((entity) => entity.type === activeTab)
              .map((entity) => {
                const displayName =
                  entity.type === 'netid'
                    ? entity._id
                    : entity.org_name ||
                      organizations.find((org) => org.id === entity._id)
                        ?.name ||
                      entity._id;

                const isMaster = entity.role === masterRole;
                const isLastMaster = isMaster && mastersCount === 1;
                const canChangeRole =
                  !isLastMaster && (!isMaster || canDemoteMaster);

                const isDisabled = (role: { value: string; label: string }) => {
                  if (entity.type === 'org') {
                    if (entity.role === masterRole && !canAddMaster) {
                      return true;
                    }
                    return !(
                      canChangeRole ||
                      (role.value === masterRole && !canAddMaster)
                    );
                  }
                  return (
                    (role.value === masterRole && !canAddMaster) ||
                    (!canChangeRole && role.value !== entity.role) ||
                    (isLastMaster && role.value !== masterRole)
                  );
                };

                return (
                  <div
                    key={`${entity.type}-${entity._id}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3"
                  >
                    <span className="min-w-0 truncate">{displayName}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <ButtonGroup>
                        <Select
                          value={entity.role}
                          onValueChange={(value) => {
                            props.onChangeEntity(activeTab, entity, value);
                          }}
                        >
                          <SelectTrigger
                            className={`w-32 ${collaboratorControlBorderClass}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {props.roles.map((role) => (
                              <SelectItem
                                key={role.value}
                                value={role.value}
                                disabled={
                                  isDisabled(role) ||
                                  role.value === 'guest' ||
                                  entity.role === 'guest' ||
                                  (activeTab === 'netid' &&
                                    role.value === 'owner' &&
                                    entity._id !== props._id &&
                                    !sortedPeople
                                      .filter(
                                        (entity) => entity.role === 'owner',
                                      )
                                      .some(
                                        (entity) => entity._id === props._id,
                                      ))
                                }
                              >
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              aria-label={
                                isLastMaster
                                  ? `Cannot remove the only ${masterRole}`
                                  : 'Remove collaborator'
                              }
                              disabled={isLastMaster}
                              size="icon"
                              variant="ghost"
                              className={collaboratorControlBorderClass}
                            >
                              <XIcon />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove collaborator?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this
                                collaborator?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => {
                                  props.onRemoveEntity(activeTab, entity);
                                }}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </ButtonGroup>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
