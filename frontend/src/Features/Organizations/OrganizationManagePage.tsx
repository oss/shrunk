import dayjs from 'dayjs';
import {
  ChartLineIcon,
  CodeIcon,
  EllipsisIcon,
  PlusCircleIcon,
  SettingsIcon,
  TrashIcon,
  UserMinusIcon,
  UsersIcon,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  addGuestToOrganization,
  addMemberToOrganization,
  deleteOrganization,
  getOrganization,
  getOrganizationVisits,
  removeMemberFromOrganization,
  renameOrganization,
  setAdminStatusOrganization,
} from '@/Features/Organizations/Api';
import { serverValidateOrgName } from '@/Shared/Lib/ServerValidators';
import { getErrorMessage, getFieldError } from '@/Shared/Lib/Http';
import CompactLinkTable from '@/Features/Organizations/CompactLinkTable';
import CreateLinkDrawer from '@/Features/Links/CreateLinkDrawer';
import OrgOverview from '@/Features/Organizations/OrgOverview';
import { OrganizationVisitDatum } from '@/Features/Organizations/Types';
import CollaboratorModal, { Collaborator } from '@/Shared/CollaboratorModal';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Shared/ui/dropdown-menu';
import { Input } from '@/Shared/ui/input';
import { Label } from '@/Shared/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/Shared/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Shared/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Shared/ui/tabs';
import ErrorPage from '@/Shared/ui/error-page';
import { RouteFallback } from '@/Shared/ui/route-fallback';
import { useSession } from '@/App/useSession';

const VALID_TABS = ['members', 'overview'];
const DEFAULT_TAB = 'overview';

function ManageOrg(): React.ReactElement {
  const { netid: userNetid, privileges: userPrivileges } = useSession();
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);
  const [showCreateLinkDrawer, setShowCreateLinkDrawer] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [destructivePending, setDestructivePending] = useState(false);

  const canCreate: boolean =
    userPrivileges.has('admin') || userPrivileges.has('facstaff');
  const organizationQuery = useQuery({
    queryKey: ['organization', id],
    queryFn: () => getOrganization(id),
    enabled: id !== '',
  });
  const organization = organizationQuery.data ?? null;
  const mayViewVisits =
    organization?.role === 'admin' || userPrivileges.has('admin');
  const visitsQuery = useQuery({
    queryKey: ['organization', id, 'visits'],
    queryFn: () => getOrganizationVisits(id),
    enabled: mayViewVisits,
  });
  const visitStats: OrganizationVisitDatum[] | null =
    visitsQuery.data?.visits ?? null;
  const adminsCount =
    organization?.members.filter((member) => member.role === 'admin').length ??
    0;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const normalizedTab = tab === 'links' ? DEFAULT_TAB : tab;

    if (normalizedTab && VALID_TABS.includes(normalizedTab)) {
      setActiveTab(normalizedTab);
      if (tab !== normalizedTab) {
        setSearchParams(
          (current) => {
            const next = new URLSearchParams(current);
            next.set('tab', normalizedTab);
            return next;
          },
          { replace: true },
        );
      }
      return;
    }

    setActiveTab(DEFAULT_TAB);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('tab', DEFAULT_TAB);
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const refreshOrganization = async () => {
    await organizationQuery.refetch();
    if (mayViewVisits) await visitsQuery.refetch();
  };

  const onAddMember = async (netid: string, role: string) => {
    if (role === 'guest') {
      await addGuestToOrganization(id, netid);
    } else if (role === 'member') {
      await addMemberToOrganization(id, netid);
    }
    if (role === 'admin') {
      await setAdminStatusOrganization(id, netid, 'admin');
    }
    await refreshOrganization();
  };

  const onDeleteMember = async (netid: string) => {
    await removeMemberFromOrganization(id, netid);
    await refreshOrganization();
  };

  const onChangeAdmin = async (netid: string, role: string) => {
    await setAdminStatusOrganization(id, netid, role);
    await refreshOrganization();
  };

  const onRenameOrg = async (newName: string) => {
    await renameOrganization(id, newName);
    navigate('/app/orgs');
  };

  const onLeaveOrg = async () => {
    setDestructivePending(true);
    try {
      await removeMemberFromOrganization(id, userNetid);
      navigate('/app/orgs');
    } catch {
      toast.error('Unable to leave organization.');
      setDestructivePending(false);
    }
  };

  const onDeleteOrganization = async () => {
    setDestructivePending(true);
    try {
      await deleteOrganization(id);
      navigate('/app/orgs');
    } catch {
      toast.error('Unable to delete organization.');
      setDestructivePending(false);
    }
  };

  const handleTabChange = (key: string) => {
    if (VALID_TABS.includes(key)) {
      setActiveTab(key);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.set('tab', key);
        return next;
      });
    }
  };

  const onEditOrganization = async () => {
    setEditModalVisible(true);
  };

  const handleRenameOrg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newName = formData.get('newName') as string;

    if (!newName) {
      setNameError('Please input a new name.');
      return;
    }
    if (newName.length > 60) {
      setNameError('Org names can be at most 60 characters long');
      return;
    }
    if (!/^[a-zA-Z0-9_.,-]*$/.test(newName)) {
      setNameError(
        'Name must consist of letters, numbers, and the characters "_.,-".',
      );
      return;
    }

    setSubmitting(true);
    try {
      await serverValidateOrgName(newName);
      await onRenameOrg(newName);
      setEditModalVisible(false);
    } catch (error) {
      setNameError(
        getFieldError(error, 'name') ??
          getErrorMessage(error, 'Organization name is already taken'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (organizationQuery.isError) {
    return (
      <ErrorPage
        title="Unable to load organization"
        description="Please try again later."
        onRetry={() => void organizationQuery.refetch()}
      />
    );
  }

  if (organizationQuery.isPending || !organization) {
    return <RouteFallback />;
  }

  if (visitsQuery.isError) {
    return (
      <ErrorPage
        title="Unable to load organization visits"
        description="Please try again later."
        onRetry={() => void visitsQuery.refetch()}
      />
    );
  }

  const isAdmin = organization.role === 'admin' || userPrivileges.has('admin');
  const userMayNotLeave = organization.role === 'admin' && adminsCount === 1;

  return (
    <>
      <div className="-mx-6 min-h-[calc(100dvh-var(--app-header-height,0px))] bg-background px-6 pb-8 text-foreground">
        <div className="mx-auto max-w-[82rem]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="app-page-heading text-foreground">
              {organization.name}
            </h1>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  aria-label="Collaborate with organization members"
                  className="inline-flex items-center gap-2"
                  onClick={() => setShareModalVisible(true)}
                >
                  <UsersIcon className="h-4 w-4" />
                  Collaborate
                </Button>
              )}
              <Button
                aria-label="Create organization link"
                className="inline-flex items-center gap-2"
                onClick={() => setShowCreateLinkDrawer(true)}
              >
                <PlusCircleIcon className="h-4 w-4" />
                Create
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Organization actions"
                    className="w-9 p-0"
                  >
                    <EllipsisIcon className="h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="border-border bg-popover text-popover-foreground shadow-md"
                >
                  <DropdownMenuItem onClick={onEditOrganization}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem
                      onClick={() => {
                        navigate(`/app/orgs/${id}/tokens`);
                      }}
                    >
                      <CodeIcon className="mr-2 h-4 w-4" />
                      Access Tokens
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-border dark:bg-primary-foreground/10" />
                  <DropdownMenuItem
                    onClick={onLeaveOrg}
                    disabled={
                      destructivePending ||
                      (userMayNotLeave && organization.role === 'member')
                    }
                    className="text-destructive focus:text-destructive"
                  >
                    <UserMinusIcon className="mr-2 h-4 w-4" />
                    Leave
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="mt-8"
          >
            <TabsList>
              <TabsTrigger value="overview">
                <span className="inline-flex items-center gap-2.5">
                  <ChartLineIcon className="h-4 w-4 shrink-0" />
                  <span>Overview</span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="members">
                <span className="inline-flex items-center gap-2.5">
                  <UsersIcon className="h-4 w-4 shrink-0" />
                  <span>Members</span>
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 focus-visible:ring-0">
              <div>
                <CompactLinkTable
                  canCreate={canCreate}
                  org_id={organization.id}
                  userNetid={userNetid}
                  isAdmin={isAdmin}
                />
              </div>
            </TabsContent>
            <TabsContent value="members" className="mt-4 focus-visible:ring-0">
              <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
                <div className="min-w-0">
                  <OrgOverview
                    totalMembers={organization.members.length}
                    orgId={organization.id}
                    isMobile={isMobile}
                    orientation="stacked"
                  />
                </div>
                <div className="min-w-0 overflow-x-auto rounded-xl border bg-card">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead>Member</TableHead>
                        {isAdmin && <TableHead>Total Visits</TableHead>}
                        {isAdmin && <TableHead>Unique Visits</TableHead>}
                        <TableHead>Role</TableHead>
                        <TableHead>Date Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organization.members.map((member) => (
                        <TableRow key={member.netid}>
                          <TableCell className="font-semibold">
                            {member.netid}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              {visitStats?.find((v) => v.netid === member.netid)
                                ?.total_visits || 0}
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell>
                              {visitStats?.find((v) => v.netid === member.netid)
                                ?.unique_visits || 0}
                            </TableCell>
                          )}
                          <TableCell className="capitalize">
                            {member.role === 'admin'
                              ? 'Admin'
                              : member.role === 'guest'
                                ? 'Guest'
                                : 'Member'}
                          </TableCell>
                          <TableCell>
                            {dayjs(member.timeCreated).format('MMM D, YYYY')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Sheet
        open={editModalVisible}
        onOpenChange={(open) => {
          if (!open) setNameError('');
          setEditModalVisible(open);
        }}
      >
        <SheetContent
          side="right"
          className="border-border bg-background text-foreground sm:max-w-[720px]"
        >
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
          </SheetHeader>
          {isAdmin && (
            <form onSubmit={handleRenameOrg} className="mt-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  Public Information
                </h3>
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="newName">Organization&apos;s name</Label>
                    <Input
                      id="newName"
                      name="newName"
                      placeholder={organization.name}
                      onChange={() => setNameError('')}
                    />
                    {nameError && (
                      <p className="text-sm text-destructive">{nameError}</p>
                    )}
                  </div>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Validating...' : 'Save'}
                  </Button>
                </div>
              </div>
              <hr />
              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  Danger Zone
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Once you delete an organization, there is no going back.
                  Please be certain.
                </p>
                <div className="mt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <TrashIcon className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you sure you want to delete this organization?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={destructivePending}>
                          No
                        </AlertDialogCancel>
                        <AlertDialogAction
                          disabled={destructivePending}
                          onClick={(event) => {
                            event.preventDefault();
                            void onDeleteOrganization();
                          }}
                        >
                          {destructivePending ? 'Deleting…' : 'Yes'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>

      <CollaboratorModal
        _id={userNetid}
        canCreate={canCreate}
        onlyActiveTab="netid"
        multipleMasters={true}
        visible={shareModalVisible}
        roles={[
          { label: 'Admin', value: 'admin' },
          { label: 'Member', value: 'member' },
          { label: 'Guest', value: 'guest' },
        ]}
        people={organization.members.map((member) => ({
          _id: member.netid,
          type: 'netid',
          role: member.role,
        }))}
        onAddEntity={(_activeTab: 'netid' | 'org', value: Collaborator) =>
          onAddMember(value._id, value.role!)
        }
        onRemoveEntity={(_activeTab: 'netid' | 'org', value: Collaborator) =>
          onDeleteMember(value._id)
        }
        onChangeEntity={(
          _activeTab: 'netid' | 'org',
          value: Collaborator,
          newRole: string,
        ) => onChangeAdmin(value._id, newRole)}
        onCancel={() => setShareModalVisible(false)}
        onOk={() => setShareModalVisible(false)}
      />
      <CreateLinkDrawer
        onCancel={() => setShowCreateLinkDrawer(false)}
        visible={showCreateLinkDrawer}
        title="Create a link"
        userOrgs={[]}
        onFinish={async () => {
          setShowCreateLinkDrawer(false);
        }}
        userPrivileges={userPrivileges}
        org_id={id}
      />
    </>
  );
}

export default ManageOrg;
