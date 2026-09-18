import { PlusCircleIcon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { getOrganizations } from '@/Features/Organizations/Api';
import {
  serverValidateGuest,
  serverValidateNetId,
} from '@/Shared/Lib/ServerValidators';
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
} from '@/Shared/ui/alert-dialog';
import { Button } from '@/Shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/Shared/ui/dialog';
import { Input } from '@/Shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Shared/ui/tabs';
import { Organization } from '@/Features/Organizations/Types';
import { ButtonGroup } from '@/Shared/ui/button-group';

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
  canCreate: boolean;
  onAddEntity: (
    activeTab: 'netid' | 'org',
    value: Collaborator,
  ) => Promise<void>;
  onChangeEntity: (
    activeTab: 'netid' | 'org',
    value: Collaborator,
    newRole: string,
  ) => Promise<void>;
  onRemoveEntity: (
    activeTab: 'netid' | 'org',
    value: Collaborator,
  ) => Promise<void>;
  onOk: () => void;
  onCancel: () => void;

  multipleMasters?: boolean;
  canAssignMasterRole?: boolean;

  onlyActiveTab?: 'netid' | 'org';
}

const collaboratorControlBorderClass = 'border border-border';

export default function CollaboratorModal({
  visible,
  people,
  _id,
  roles,
  canCreate,
  onAddEntity,
  onChangeEntity,
  onRemoveEntity,
  onOk: _onOk,
  onCancel,
  multipleMasters,
  canAssignMasterRole: canAssignMasterRoleProp,
  onlyActiveTab,
}: ICollaboratorModal) {
  const [collaboratorRole, setCollaboratorRole] = useState<string>(
    roles[1].value,
  );
  const [activeTab, setActiveTab] = useState<'netid' | 'org'>(
    onlyActiveTab ?? 'netid',
  );
  const [netid, setNetid] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [mutationPending, setMutationPending] = useState(false);

  const organizationsQuery = useQuery({
    queryKey: ['user-organizations'],
    queryFn: () => getOrganizations('user'),
    enabled: visible && onlyActiveTab !== 'netid',
  });
  const organizations: Organization[] = organizationsQuery.data ?? [];

  const masterRole = roles[0].value;

  useEffect(() => {
    if (onlyActiveTab) {
      setActiveTab(onlyActiveTab);
    }
  }, [onlyActiveTab]);

  const sortedPeople = useMemo(() => {
    const permissionOrder: { [key: string]: number } = {};
    roles.forEach((role, index) => {
      permissionOrder[role.value] = index;
    });

    return [...people].sort((a: Collaborator, b: Collaborator) => {
      if (a.role === undefined || b.role === undefined) {
        throw new Error('Collaborator must have a role');
      }
      return permissionOrder[a.role] - permissionOrder[b.role];
    });
  }, [people, roles]);

  const mastersCount = people.filter(
    (entity) => entity.role === masterRole,
  ).length;

  const canAddMaster = multipleMasters || mastersCount === 0;
  const canDemoteMaster = multipleMasters && mastersCount > 1;
  const canAssignMasterRole = canAssignMasterRoleProp ?? true;

  const validateNetId = async (value: string) => {
    if (value.trim() === '') {
      return false;
    }

    try {
      if (collaboratorRole === 'guest') {
        await serverValidateGuest(value);
      } else {
        await serverValidateNetId(value);
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

      setMutationPending(true);
      try {
        await onAddEntity(activeTab, {
          _id: netid,
          type: activeTab,
          role: collaboratorRole,
        });
        setNetid('');
      } catch {
        setValidationError('Unable to add collaborator.');
      } finally {
        setMutationPending(false);
      }
      return;
    }

    if (organizationId === '') {
      setValidationError('Please select an organization.');
      return;
    }

    setMutationPending(true);
    try {
      await onAddEntity(activeTab, {
        _id: organizationId,
        type: activeTab,
        role: collaboratorRole,
      });
      setOrganizationId('');
      setValidationError(null);
    } catch {
      setValidationError('Unable to add collaborator.');
    } finally {
      setMutationPending(false);
    }
  };

  const availableTabs = [
    ...(['netid', undefined].includes(onlyActiveTab) ? ['netid'] : []),
    ...(['org', undefined].includes(onlyActiveTab) ? ['org'] : []),
  ] as Array<'netid' | 'org'>;

  return (
    <Dialog
      open={visible}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
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
                  aria-label="Collaborator NetID"
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
              ) : organizationsQuery.isPending ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Loading organizations…
                </p>
              ) : organizationsQuery.isError ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <span>Unable to load your organizations.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void organizationsQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <Select
                  value={organizationId}
                  onValueChange={(value) => {
                    setOrganizationId(value);
                    setValidationError(null);
                  }}
                >
                  <SelectTrigger
                    aria-label="Collaborator organization"
                    className={collaboratorControlBorderClass}
                  >
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
                  aria-label="Collaborator role"
                  className={`w-24 pr-2 ${collaboratorControlBorderClass}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
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
              <Button
                onClick={handleAddEntity}
                disabled={
                  mutationPending ||
                  (activeTab === 'org' && !organizationsQuery.isSuccess)
                }
              >
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
            {availableTabs.map((tab) => (
              <TabsContent key={tab} value={tab} className="hidden" />
            ))}
          </Tabs>

          <div className="space-y-3">
            {sortedPeople.filter((entity) => entity.type === activeTab).length >
            0 ? (
              sortedPeople
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

                  const isDisabled = (role: {
                    value: string;
                    label: string;
                  }) => {
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
                            disabled={mutationPending}
                            onValueChange={async (value) => {
                              setMutationPending(true);
                              try {
                                await onChangeEntity(activeTab, entity, value);
                              } catch {
                                setValidationError(
                                  'Unable to update collaborator.',
                                );
                              } finally {
                                setMutationPending(false);
                              }
                            }}
                          >
                            <SelectTrigger
                              aria-label={`Role for ${displayName}`}
                              className={`w-32 ${collaboratorControlBorderClass}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((role) => (
                                <SelectItem
                                  key={role.value}
                                  value={role.value}
                                  disabled={
                                    isDisabled(role) ||
                                    role.value === 'guest' ||
                                    entity.role === 'guest' ||
                                    (activeTab === 'netid' &&
                                      role.value === 'owner' &&
                                      entity._id !== _id &&
                                      !sortedPeople
                                        .filter(
                                          (person) => person.role === 'owner',
                                        )
                                        .some((person) => person._id === _id))
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
                                  disabled={mutationPending}
                                  onClick={async () => {
                                    setMutationPending(true);
                                    try {
                                      await onRemoveEntity(activeTab, entity);
                                    } catch {
                                      setValidationError(
                                        'Unable to remove collaborator.',
                                      );
                                    } finally {
                                      setMutationPending(false);
                                    }
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
                })
            ) : (
              <div>
                {canCreate ? (
                  <span>
                    {' '}
                    You aren&apos;t currently apart of any organizations! Ask
                    somebody to add you to one or{' '}
                    <Link
                      to="/app/orgs"
                      className="text-primary underline decoration-primary underline-offset-4 dark:text-foreground"
                    >
                      <br />
                      create your own
                    </Link>
                    .{' '}
                  </span>
                ) : (
                  <span>
                    {' '}
                    You aren&apost currently apart of any organizations! Ask
                    somebody to add you to one.{' '}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
