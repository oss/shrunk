import { useState, useEffect, useRef, useCallback } from 'react';
import { FilterIcon, PlusCircleIcon } from 'lucide-react';
import { Link as RouterLink } from 'react-router';
import MultiLinkSelectPopup from '@/components/MultiLinkSelectPopup';
import CollaboratorModal, { Collaborator } from '@/modals/CollaboratorModal';
import {
  addCollaboratorBulk,
  deleteLinkBulk,
  searchLinks,
  transferLinksBulk,
} from '../api/links';
import { getOrganizations } from '../api/organization';
import { serverValidateNetId } from '../api/validators';
import DashboardSearch from '../components/DashboardSearch';
import CreateLinkDrawer from '../drawers/CreateLinkDrawer';
import {
  Link,
  SearchQuery,
  DEFAULT_QUERY,
  LinkSharedWith,
} from '../interfaces/link';
import { Organization } from '../interfaces/organizations';
import LinkCard from '../components/LinkCard';
import BulkTransferModal from '@/modals/BulkTransferModal';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Props {
  userPrivileges: Set<string>;
  netid: string;
  mockData?: Link[];
  demo?: boolean;
}

interface Filters {
  title: string;
  alias: string;
  owner: string;
  url: string;
}

const LINKS_PER_BATCH = 10;

export default function Dashboard({
  userPrivileges,
  netid: _netid,
  mockData,
  demo,
}: Props) {
  const [userOrgs, setUserOrgs] = useState<Organization[] | null>(null);
  const [linkInfo, setLinkInfo] = useState<Link[] | null>(
    mockData === undefined ? null : mockData.slice(0, LINKS_PER_BATCH),
  );
  const [query, setQuery] = useState<SearchQuery>(DEFAULT_QUERY);
  const [nextOffset, setNextOffset] = useState<number>(LINKS_PER_BATCH);
  const [hasMore, setHasMore] = useState<boolean>(
    (mockData?.length ?? 0) > LINKS_PER_BATCH,
  );
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [failedOffset, setFailedOffset] = useState<number | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [checkedLinks, setCheckedLinks] = useState<Link[]>([]);
  const [collabModalVisible, setCollabModalVisible] = useState<boolean>(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkTransferOpen, setBulkTransferOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  const [filters, setFilters] = useState<Filters>({
    title: '',
    alias: '',
    url: '',
    owner: '',
  });
  const contextHeaderRef = useRef<HTMLElement>(null);
  const loadMoreSentinelRef = useRef<HTMLSpanElement>(null);
  const queryVersionRef = useRef<number>(0);
  const activeQueryRequestRef = useRef<number | null>(null);
  const loadRequestSequenceRef = useRef<number>(0);
  const activeLoadRequestRef = useRef<number | null>(null);
  const hasLoadedInitialQueryRef = useRef<boolean>(false);

  const doQuery = useCallback(
    async (
      newQuery: SearchQuery,
      skip: number,
      limit: number,
    ): Promise<{ count: number; results: Link[] }> => {
      const req: any = {
        title: newQuery.title,
        alias: newQuery.alias,
        url: newQuery.url,
        set: newQuery.set,
        show_expired_links: newQuery.show_expired_links,
        show_deleted_links: newQuery.show_deleted_links,
        sort: newQuery.sort,
        pagination: { skip, limit },
        show_type: newQuery.showType,
      };

      if (newQuery.begin_time !== null) {
        req.begin_time = newQuery.begin_time.format();
      }

      if (newQuery.end_time !== null) {
        req.end_time = newQuery.end_time.format();
      }

      if (newQuery.owner) {
        req.owner = newQuery.owner;
      }

      const result = await searchLinks(req);
      return {
        count: result.count,
        results: result.results.map(
          (output: any) =>
            ({
              ...output,

              created_time: new Date(output.created_time),
              expiration_time: !output.expiration_time
                ? null
                : new Date(output.expiration_time),
              deletion_info: !output.deletion_info
                ? null
                : {
                    deleted_by: output.deletion_info.deleted_by,
                    deleted_time: new Date(output.deletion_info.deleted_time),
                  },
            }) as Link,
        ),
      };
    },
    [],
  );

  const setNewQuery = useCallback(
    async (newQuery: SearchQuery): Promise<void> => {
      if (demo) {
        return;
      }

      if (newQuery === DEFAULT_QUERY) {
        setFilters({ title: '', alias: '', owner: '', url: '' });
      }

      if (newQuery.owner && newQuery.owner !== query.owner) {
        try {
          await serverValidateNetId({}, newQuery.owner);
        } catch {
          return;
        }
      }

      const requestVersion = queryVersionRef.current + 1;
      queryVersionRef.current = requestVersion;
      activeQueryRequestRef.current = requestVersion;

      try {
        const results = await doQuery(newQuery, 0, LINKS_PER_BATCH);

        if (queryVersionRef.current !== requestVersion) {
          return;
        }

        setLinkInfo(results.results);
        setQuery(newQuery);
        setNextOffset(LINKS_PER_BATCH);
        setHasMore(
          results.results.length > 0 && LINKS_PER_BATCH < results.count,
        );
        activeLoadRequestRef.current = null;
        setIsLoadingMore(false);
        setFailedOffset(null);
        setCheckedLinks([]);
        window.scrollTo({ top: 0 });
      } finally {
        if (activeQueryRequestRef.current === requestVersion) {
          activeQueryRequestRef.current = null;
        }
      }
    },
    [demo, query.owner, doQuery],
  );

  const loadMore = useCallback(async (): Promise<void> => {
    if (
      !hasMore ||
      activeQueryRequestRef.current !== null ||
      activeLoadRequestRef.current !== null ||
      failedOffset !== null
    ) {
      return;
    }

    const offset = nextOffset;

    if (demo) {
      const nextLinks = mockData?.slice(offset, offset + LINKS_PER_BATCH) ?? [];
      setLinkInfo((current) => [...(current ?? []), ...nextLinks]);
      setNextOffset(offset + LINKS_PER_BATCH);
      setHasMore(
        nextLinks.length > 0 &&
          offset + LINKS_PER_BATCH < (mockData?.length ?? 0),
      );
      return;
    }

    const loadRequestId = loadRequestSequenceRef.current + 1;
    loadRequestSequenceRef.current = loadRequestId;
    activeLoadRequestRef.current = loadRequestId;
    setIsLoadingMore(true);
    const requestVersion = queryVersionRef.current;

    try {
      const results = await doQuery(query, offset, LINKS_PER_BATCH);

      if (queryVersionRef.current !== requestVersion) {
        return;
      }

      setLinkInfo((current) => [...(current ?? []), ...results.results]);
      setNextOffset(offset + LINKS_PER_BATCH);
      setHasMore(
        results.results.length > 0 && offset + LINKS_PER_BATCH < results.count,
      );
      setFailedOffset(null);
    } catch {
      if (queryVersionRef.current === requestVersion) {
        setFailedOffset(offset);
      }
    } finally {
      if (activeLoadRequestRef.current === loadRequestId) {
        activeLoadRequestRef.current = null;
        setIsLoadingMore(false);
      }
    }
  }, [demo, doQuery, failedOffset, hasMore, mockData, nextOffset, query]);

  const retryLoadMore = useCallback(() => {
    setFailedOffset(null);
  }, []);

  const refreshResults = useCallback(async (): Promise<void> => {
    if (demo) {
      return;
    }

    const requestVersion = queryVersionRef.current + 1;
    queryVersionRef.current = requestVersion;
    activeQueryRequestRef.current = requestVersion;

    const refreshLimit = Math.max(LINKS_PER_BATCH, nextOffset);
    try {
      const results = await doQuery(query, 0, refreshLimit);

      if (queryVersionRef.current !== requestVersion) {
        return;
      }

      setLinkInfo(results.results);
      setHasMore(results.results.length > 0 && refreshLimit < results.count);
      setNextOffset(refreshLimit);
      setFailedOffset(null);
      setCheckedLinks((selected) => {
        const refreshedLinks = new Map(
          results.results.map((result) => [result._id, result]),
        );
        return selected.flatMap((link) => {
          const refreshed = refreshedLinks.get(link._id);
          return refreshed ? [refreshed] : [];
        });
      });
    } finally {
      if (activeQueryRequestRef.current === requestVersion) {
        activeQueryRequestRef.current = null;
      }
    }
  }, [demo, doQuery, nextOffset, query]);

  const refreshAfterBulkAction = async (): Promise<void> => {
    try {
      await refreshResults();
    } catch {
      toast.error('Failed to refresh links');
    }
  };

  const selectedLinkIds = checkedLinks.map((link) => link._id);
  const visibleCheckedCount =
    linkInfo?.filter((link) =>
      checkedLinks.some((selected) => selected._id === link._id),
    ).length ?? 0;
  const allVisibleSelected =
    !!linkInfo &&
    linkInfo.length > 0 &&
    visibleCheckedCount === linkInfo.length;
  const someVisibleSelected =
    !!linkInfo && visibleCheckedCount > 0 && !allVisibleSelected;
  const shareDisabled = checkedLinks.some((link) => !link.may_edit);
  const deleteDisabled = checkedLinks.some((link) => link.may_delete !== true);
  const transferDisabled = checkedLinks.some(
    (link) => link.may_transfer !== true,
  );

  const handleCheckedLinkChange = (link: Link, checked: boolean) => {
    setCheckedLinks((current) => {
      if (checked) {
        if (current.some((selected) => selected._id === link._id)) {
          return current;
        }
        return [...current, link];
      }
      return current.filter((selected) => selected._id !== link._id);
    });
  };

  const toggleVisibleSelection = (checked: boolean) => {
    if (!linkInfo) {
      return;
    }

    setCheckedLinks((current) => {
      if (checked) {
        const currentIds = new Set(current.map((link) => link._id));
        const next = [...current];
        linkInfo.forEach((link) => {
          if (!currentIds.has(link._id)) {
            next.push(link);
          }
        });
        return next;
      }

      const visibleIds = new Set(linkInfo.map((link) => link._id));
      return current.filter((link) => !visibleIds.has(link._id));
    });
  };

  const handleBulkShare = async (
    activeTab: 'netid' | 'org',
    entity: Collaborator,
  ) => {
    try {
      await addCollaboratorBulk(
        selectedLinkIds,
        { _id: entity._id, type: activeTab },
        entity.role as 'editor' | 'viewer',
      );
      toast.success('Selected links shared successfully');
      setCollabModalVisible(false);
      setCheckedLinks([]);
    } catch {
      toast.error('Failed to share selected links');
    } finally {
      await refreshAfterBulkAction();
    }
  };

  const handleBulkDelete = async () => {
    try {
      await deleteLinkBulk(selectedLinkIds);
      toast.success('Selected links deleted successfully');
      setBulkDeleteOpen(false);
      setCheckedLinks([]);
    } catch {
      toast.error('Failed to delete selected links');
    } finally {
      await refreshAfterBulkAction();
    }
  };

  const handleBulkTransfer = async (owner: LinkSharedWith) => {
    try {
      await transferLinksBulk(selectedLinkIds, owner);
      toast.success('Selected links transferred successfully');
      setBulkTransferOpen(false);
      setCheckedLinks([]);
    } catch {
      toast.error('Failed to transfer selected links');
    } finally {
      await refreshAfterBulkAction();
    }
  };

  useEffect(() => {
    const fetchUserOrgs = async (): Promise<void> => {
      if (demo) {
        return;
      }
      try {
        const getUserOrgs = await getOrganizations('user');
        setUserOrgs(getUserOrgs);
      } catch (error) {
        throw new Error(`Failed to set user orgs: ${error}`);
      }
    };

    fetchUserOrgs();
  }, [demo]);

  useEffect(() => {
    if (hasLoadedInitialQueryRef.current) {
      return;
    }

    hasLoadedInitialQueryRef.current = true;
    setNewQuery(DEFAULT_QUERY);
  }, [setNewQuery]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;

    if (!sentinel || !hasMore || failedOffset !== null) {
      return undefined;
    }

    const rootMargin = window.matchMedia('(min-width: 1024px)').matches
      ? '600px 0px'
      : '250px 0px';

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void loadMore();
        }
      },
      { root: null, rootMargin, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [failedOffset, hasMore, loadMore]);

  useEffect(() => {
    let lastContextHeaderHeight = -1;

    const setContextHeaderHeight = () => {
      const contextHeaderHeight = Math.round(
        contextHeaderRef.current?.getBoundingClientRect().height ?? 0,
      );

      if (contextHeaderHeight === lastContextHeaderHeight) {
        return;
      }

      lastContextHeaderHeight = contextHeaderHeight;

      document.documentElement.style.setProperty(
        '--dashboard-context-height',
        `${contextHeaderHeight}px`,
      );
    };

    setContextHeaderHeight();
    const resizeObserver = new ResizeObserver(setContextHeaderHeight);
    if (contextHeaderRef.current) {
      resizeObserver.observe(contextHeaderRef.current);
    }
    window.addEventListener('resize', setContextHeaderHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', setContextHeaderHeight);
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-col bg-background text-foreground">
      <section
        ref={contextHeaderRef}
        className="sticky top-[var(--app-header-height,0px)] z-30 shrink-0 bg-background pt-5"
      >
        <nav className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <RouterLink to="/app/dash" className="hover:text-foreground">
            Home
          </RouterLink>
          <span>/</span>
          <span className="text-foreground">URL Shortener</span>
        </nav>

        <section className="hidden pt-6 pb-4 lg:block">
          <div className="flex items-center justify-between">
            <h1 className="m-0 text-4xl leading-none font-bold tracking-normal">
              URL Shortener
            </h1>
            <Button
              id="dashboard-create-desktop"
              aria-label="Create link"
              className="h-10 rounded-md px-5 text-base font-semibold shadow-none"
              onClick={() => setCreateModalOpen(true)}
            >
              <PlusCircleIcon />
              Create
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-4 pt-6 pb-4 lg:hidden">
          <h2 className="m-0 text-3xl font-bold">URL Shortener</h2>
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              aria-label="Open dashboard filters"
              className="border-border bg-background shadow-none"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <FilterIcon />
              Filter
            </Button>
            <Button
              id="dashboard-create-mobile"
              aria-label="Create link"
              className="shadow-none"
              onClick={() => setCreateModalOpen(true)}
            >
              <PlusCircleIcon />
              Create
            </Button>
          </div>
        </section>
      </section>

      <div className="flex min-h-0 flex-1 bg-background">
        <div className="flex min-h-0 flex-1 bg-background lg:gap-5">
          <aside className="hidden min-h-0 pr-4 lg:block lg:w-[390px] lg:shrink-0">
            <section className="sticky top-[calc(var(--app-header-height,80px)+var(--dashboard-context-height,0px)+1rem)] max-h-[calc(100dvh-var(--app-header-height,80px)-var(--dashboard-context-height,0px)-2rem)] [scrollbar-color:hsl(var(--muted-foreground))_hsl(var(--muted))] overflow-y-auto pr-1">
              <DashboardSearch
                query={query}
                filters={filters}
                setFilters={setFilters}
                setNewQuery={setNewQuery}
                userOrgs={userOrgs}
                userPrivileges={userPrivileges}
              />
            </section>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            <section className="min-h-0 min-w-0 flex-1 pr-1">
              {linkInfo === null ? (
                <div
                  className="flex min-h-full items-center justify-center py-6 text-center text-sm text-muted-foreground"
                  role="status"
                >
                  Loading links…
                </div>
              ) : linkInfo.length === 0 ? (
                <div className="justify-top flex min-h-full flex-col items-center py-6 text-center text-muted-foreground">
                  <p className="text-lg">No data</p>
                  <p className="text-sm">No links found</p>
                </div>
              ) : (
                <div className="flex w-full min-w-0 flex-col gap-3">
                  {linkInfo.map((link: Link) => (
                    <LinkCard
                      key={link._id || link.alias}
                      linkInfo={link}
                      checked={checkedLinks.some(
                        (selected) => selected._id === link._id,
                      )}
                      onCheckedChange={handleCheckedLinkChange}
                    />
                  ))}
                  <span
                    ref={loadMoreSentinelRef}
                    className="block h-px"
                    aria-hidden="true"
                  />
                  <div
                    className="flex items-center justify-center py-4 text-sm text-muted-foreground"
                    role="status"
                    aria-live="polite"
                  >
                    {failedOffset !== null ? (
                      <div className="flex flex-col items-center gap-2">
                        <span>Couldn’t load more links.</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={retryLoadMore}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : isLoadingMore ? (
                      'Loading more links…'
                    ) : hasMore ? null : (
                      'All links loaded'
                    )}
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      <CreateLinkDrawer
        title="Create Link"
        visible={isCreateModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onFinish={async () => {
          setCreateModalOpen(false);
          refreshResults();
        }}
        userPrivileges={userPrivileges}
        userOrgs={userOrgs ?? []}
      />

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="left" className="bg-background">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <DashboardSearch
            query={query}
            filters={filters}
            setFilters={setFilters}
            setNewQuery={setNewQuery}
            userOrgs={userOrgs}
            userPrivileges={userPrivileges}
          />
        </SheetContent>
      </Sheet>

      <MultiLinkSelectPopup
        selectedCount={checkedLinks.length}
        onClear={() => setCheckedLinks([])}
        onShare={{
          disabled: shareDisabled,
          disabledReason: 'Only links you can edit can be shared.',
          onClick: () => setCollabModalVisible(true),
        }}
        onTransfer={{
          disabled: transferDisabled,
          disabledReason: 'Only links you own can be transferred.',
          onClick: () => setBulkTransferOpen(true),
        }}
        onDelete={{
          disabled: deleteDisabled,
          disabledReason: 'Only links you own can be deleted.',
          onClick: () => setBulkDeleteOpen(true),
        }}
        allVisibleSelected={allVisibleSelected}
        someVisibleSelected={someVisibleSelected}
        toggleVisibleSelection={toggleVisibleSelection}
        totalLinks={linkInfo?.length}
        visibleCheckedCount={visibleCheckedCount}
      />

      <CollaboratorModal
        _id={_netid}
        canCreate={
          userPrivileges.has('admin') || userPrivileges.has('facstaff')
        }
        visible={collabModalVisible}
        people={[]}
        roles={[
          { value: 'editor', label: 'Editor' },
          { value: 'viewer', label: 'Viewer' },
        ]}
        onAddEntity={handleBulkShare}
        onChangeEntity={() => {}}
        onRemoveEntity={() => {}}
        onOk={() => setCollabModalVisible(false)}
        onCancel={() => setCollabModalVisible(false)}
        multipleMasters
      />

      <BulkTransferModal
        visible={bulkTransferOpen}
        selectedCount={checkedLinks.length}
        onOk={handleBulkTransfer}
        onCancel={() => setBulkTransferOpen(false)}
      />

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected links?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete {checkedLinks.length}{' '}
              {checkedLinks.length === 1 ? 'link' : 'links'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
