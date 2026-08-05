import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
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

import {
  addGuestToOrganization,
  addMemberToOrganization,
  deleteOrganization,
  getOrganization,
  getOrganizationVisits,
  removeMemberFromOrganization,
  renameOrganization,
  setAdminStatusOrganization,
} from '@/api/organization';
import CompactLinkTable from '@/components/orgs/CompactLinkTable';
import CreateLinkDrawer from '@/drawers/CreateLinkDrawer';
import OrgOverview from '@/components/orgs/OrgOverview';
import { Organization } from '@/interfaces/organizations';
import CollaboratorModal, { Collaborator } from '@/modals/CollaboratorModal';
import { useFormState } from '@/lib/use-form-state';
import { renameOrgFormSchema } from '@/lib/validations';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  adminContentWidthClass,
  adminDividerClass,
  adminInputClass,
  adminOutlineButtonClass,
  adminPrimaryButtonClass,
  adminSectionTopClass,
  adminShellClass,
  adminTableCellClass,
  adminTableHeadClass,
  adminTableHeadDividerClass,
  adminTableRowClass,
  adminTableWrapperClass,
  adminTabsListClass,
  adminTabTriggerClass,
} from '@/lib/admin-styles';

type Props = {
  userNetid: string;
  userPrivileges: Set<string>;
};

interface VisitDatum {
  netid: string;
  total_visits: number;
  unique_visits: number;
}

const VALID_TABS = ['members', 'overview'];
const DEFAULT_TAB = 'overview';

function ManageOrg({ userNetid, userPrivileges }: Props): React.ReactElement {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [adminsCount, setAdminsCount] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [visitStats, setVisitStats] = useState<VisitDatum[] | null>(null);
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);
  const [showCreateLinkDrawer, setShowCreateLinkDrawer] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const canCreate: boolean =
    userPrivileges.has('admin') || userPrivileges.has('facstaff');

  const {
    errors: nameErrors,
    submitting,
    validate: validateName,
    clearErrors,
  } = useFormState(renameOrgFormSchema);

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
    const info = await getOrganization(id);

    if (info.role === 'admin' || userPrivileges.has('admin')) {
      const visitData = await getOrganizationVisits(id);
      setVisitStats(visitData.visits);
    }

    const adminCount = info.members.filter(
      (member) => member.role === 'admin',
    ).length;

    setOrganization(info);
    setAdminsCount(adminCount);
  };

  useEffect(() => {
    refreshOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
    removeMemberFromOrganization(id, userNetid);
    navigate('/app/orgs');
  };

  const onDeleteOrganization = async () => {
    deleteOrganization(id);
    navigate('/app/orgs');
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
    const ok = await validateName({ newName });
    if (ok) {
      onRenameOrg(newName);
      setEditModalVisible(false);
    }
  };

  if (!organization) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  const isAdmin = organization.role === 'admin' || userPrivileges.has('admin');
  const userMayNotLeave = organization.role === 'admin' && adminsCount === 1;

  return (
    <>
      <div className={adminShellClass}>
        <div className={adminContentWidthClass}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="app-page-heading text-foreground">
              {organization.name}
            </h1>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  className={`inline-flex items-center gap-2 ${adminOutlineButtonClass}`}
                  onClick={() => setShareModalVisible(true)}
                >
                  <UsersIcon className="h-4 w-4" />
                  Collaborate
                </Button>
              )}
              <Button
                className={`inline-flex items-center gap-2 ${adminPrimaryButtonClass}`}
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
                    className={`${adminOutlineButtonClass} w-9 p-0`}
                  >
                    <EllipsisIcon className="h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="border-border bg-popover text-popover-foreground shadow-md dark:border-primary-foreground/10"
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
                    disabled={userMayNotLeave && organization.role === 'member'}
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
            <TabsList className={adminTabsListClass}>
              <TabsTrigger value="overview" className={adminTabTriggerClass}>
                <span className="inline-flex items-center gap-2.5">
                  <ChartLineIcon className="h-4 w-4 shrink-0" />
                  <span>Overview</span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="members" className={adminTabTriggerClass}>
                <span className="inline-flex items-center gap-2.5">
                  <UsersIcon className="h-4 w-4 shrink-0" />
                  <span>Members</span>
                </span>
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="overview"
              className={`${adminSectionTopClass} focus-visible:ring-0`}
            >
              <div>
                <CompactLinkTable
                  canCreate={canCreate}
                  org_id={organization.id}
                  userNetid={userNetid}
                  forceRefresh={forceRefresh}
                  isAdmin={isAdmin}
                />
              </div>
            </TabsContent>
            <TabsContent
              value="members"
              className={`${adminSectionTopClass} focus-visible:ring-0`}
            >
              <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)] xl:items-start">
                <div className="min-w-0">
                  <OrgOverview
                    totalMembers={organization.members.length}
                    orgId={organization.id}
                    isMobile={isMobile}
                    orientation="stacked"
                  />
                </div>
                <div className={cn(adminTableWrapperClass, 'min-w-0')}>
                  <Table>
                    <TableHeader className="bg-muted dark:bg-[#2a2a2a]">
                      <TableRow className="border-b border-border hover:bg-transparent dark:border-white/10">
                        <TableHead
                          className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                        >
                          Member
                        </TableHead>
                        {isAdmin && (
                          <TableHead
                            className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                          >
                            Total Visits
                          </TableHead>
                        )}
                        {isAdmin && (
                          <TableHead
                            className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                          >
                            Unique Visits
                          </TableHead>
                        )}
                        <TableHead
                          className={`${adminTableHeadClass} ${adminTableHeadDividerClass}`}
                        >
                          Role
                        </TableHead>
                        <TableHead className={adminTableHeadClass}>
                          Date Added
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organization.members.map((member) => (
                        <TableRow
                          key={member.netid}
                          className={adminTableRowClass}
                        >
                          <TableCell
                            className={`${adminTableCellClass} font-semibold text-foreground dark:text-[#f1f1f1]`}
                          >
                            {member.netid}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className={adminTableCellClass}>
                              {visitStats?.find((v) => v.netid === member.netid)
                                ?.total_visits || 0}
                            </TableCell>
                          )}
                          {isAdmin && (
                            <TableCell className={adminTableCellClass}>
                              {visitStats?.find((v) => v.netid === member.netid)
                                ?.unique_visits || 0}
                            </TableCell>
                          )}
                          <TableCell
                            className={`${adminTableCellClass} capitalize`}
                          >
                            {member.role === 'admin'
                              ? 'Admin'
                              : member.role === 'guest'
                                ? 'Guest'
                                : 'Member'}
                          </TableCell>
                          <TableCell className={adminTableCellClass}>
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
          if (!open) clearErrors();
          setEditModalVisible(open);
        }}
      >
        <SheetContent
          side="right"
          className="border-border bg-background text-foreground sm:max-w-[720px] dark:border-white/10 dark:bg-[#262626] dark:text-[#efefef]"
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
                      className={adminInputClass}
                    />
                    {nameErrors.newName && (
                      <p className="text-sm text-destructive">
                        {nameErrors.newName}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className={adminPrimaryButtonClass}
                  >
                    {submitting ? 'Validating...' : 'Save'}
                  </Button>
                </div>
              </div>
              <hr className={adminDividerClass} />
              <div>
                <h3 className="text-lg font-semibold tracking-tight">
                  Danger Zone
                </h3>
                <p className="mt-2 text-sm text-muted-foreground dark:text-[#a9a9a9]">
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
                        <AlertDialogCancel>No</AlertDialogCancel>
                        <AlertDialogAction onClick={onDeleteOrganization}>
                          Yes
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
        onAddEntity={(_activeTab: 'netid' | 'org', value: Collaborator) => {
          onAddMember(value._id, value.role!);
        }}
        onRemoveEntity={(_activeTab: 'netid' | 'org', value: Collaborator) => {
          onDeleteMember(value._id);
        }}
        onChangeEntity={(
          _activeTab: 'netid' | 'org',
          value: Collaborator,
          newRole: string,
        ) => {
          onChangeAdmin(value._id, newRole);
        }}
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
          setForceRefresh(!forceRefresh);
        }}
        userPrivileges={userPrivileges}
        org_id={id}
      />
    </>
  );
}

export default ManageOrg;
