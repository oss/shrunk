import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FilterIcon, PlusCircleIcon } from 'lucide-react';
import { Link as RouterLink } from 'react-router';
import { toast } from 'sonner';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import BulkLinkActions from '@/Features/Links/BulkLinkActions';
import { searchLinks } from '@/Features/Links/Api';
import { getOrganizations } from '@/Features/Organizations/Api';
import DashboardSearch from '@/Features/Links/DashboardSearch';
import CreateLinkDrawer from '@/Features/Links/CreateLinkDrawer';
import { Link, SearchQuery, DEFAULT_QUERY } from '@/Features/Links/Types';
import { type LinkTextFilters } from '@/Shared/LinkFilterControls';
import { Organization } from '@/Features/Organizations/Types';
import LinkCard from '@/Features/Links/LinkCard';
import { useLinkSelection } from '@/Features/Links/useLinkSelection';
import { Button } from '@/Shared/ui/button';
import { useSession } from '@/App/useSession';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/Shared/ui/sheet';

interface Props {
  mockData?: Link[];
  demo?: boolean;
}

const LINKS_PER_BATCH = 10;
const NO_LINKS: Link[] = [];

async function doQuery(
  newQuery: SearchQuery,
  skip: number,
  limit: number,
): Promise<{ count: number; results: Link[] }> {
  const req: Record<string, unknown> = {
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
    results: (result.results as any[]).map(
      (output) =>
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
}

export default function Dashboard({ mockData, demo }: Props) {
  const { netid, privileges: userPrivileges } = useSession();
  const [query, setQuery] = useState<SearchQuery>(DEFAULT_QUERY);
  const [filterDraft, setFilterDraft] = useState<LinkTextFilters>({
    title: '',
    alias: '',
    owner: '',
    url: '',
  });
  const [isCreateModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const contextHeaderRef = useRef<HTMLElement>(null);
  const loadMoreSentinelRef = useRef<HTMLSpanElement>(null);

  const userOrgsQuery = useQuery({
    queryKey: ['user-organizations'],
    queryFn: () => getOrganizations('user'),
    enabled: !demo,
  });
  const userOrgs: Organization[] | null = demo
    ? null
    : (userOrgsQuery.data ?? null);

  const linksQuery = useInfiniteQuery({
    queryKey: ['links', query, demo],
    queryFn: async ({ pageParam }) => {
      if (demo) {
        const results =
          mockData?.slice(pageParam, pageParam + LINKS_PER_BATCH) ?? [];
        return { count: mockData?.length ?? 0, results };
      }
      return doQuery(query, pageParam, LINKS_PER_BATCH);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (sum, page) => sum + page.results.length,
        0,
      );
      return lastPage.results.length > 0 && loaded < lastPage.count
        ? loaded
        : undefined;
    },
  });

  const linkInfo = useMemo<Link[] | null>(
    () =>
      linksQuery.data
        ? linksQuery.data.pages.flatMap((page) => page.results)
        : null,
    [linksQuery.data],
  );

  const {
    selectedItems: checkedLinks,
    selectedIds: selectedLinkIds,
    visibleSelectedCount,
    allVisibleSelected,
    someVisibleSelected,
    setItemSelected: handleCheckedLinkChange,
    toggleVisibleSelection,
    clearSelection,
  } = useLinkSelection(linkInfo ?? NO_LINKS);

  const setNewQuery = useCallback(
    (newQuery: SearchQuery): void => {
      if (demo) {
        return;
      }

      clearSelection();
      setQuery(newQuery);
      window.scrollTo({ top: 0 });
    },
    [clearSelection, demo],
  );

  const retryLoadMore = useCallback(() => {
    linksQuery.fetchNextPage();
  }, [linksQuery]);

  const refreshAfterBulkAction = async (): Promise<void> => {
    try {
      await linksQuery.refetch();
    } catch {
      toast.error('Failed to refresh links');
    }
  };

  const shareDisabled = checkedLinks.some((link) => !link.may_edit);
  const deleteDisabled = checkedLinks.some((link) => link.may_delete !== true);
  const transferDisabled = checkedLinks.some(
    (link) => link.may_transfer !== true,
  );

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;

    if (!sentinel || !linksQuery.hasNextPage) {
      return undefined;
    }

    const rootMargin = window.matchMedia('(min-width: 1024px)').matches
      ? '600px 0px'
      : '250px 0px';

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          !linksQuery.isFetchingNextPage &&
          !linksQuery.isFetchNextPageError
        ) {
          linksQuery.fetchNextPage();
        }
      },
      { root: null, rootMargin, threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [linksQuery]);

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
              className="h-10 cursor-pointer rounded-md px-5 text-base font-semibold shadow-none"
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
                draft={filterDraft}
                onDraftChange={setFilterDraft}
                setNewQuery={setNewQuery}
                userOrgs={userOrgs}
                userPrivileges={userPrivileges}
              />
            </section>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
            <section className="min-h-0 min-w-0 flex-1 pr-1">
              {linksQuery.isError && linkInfo === null ? (
                <div className="flex min-h-full flex-col items-center justify-center gap-2 py-6 text-center text-sm text-destructive">
                  <span>Unable to load links.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void linksQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : linkInfo === null ? (
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
                    {linksQuery.isFetchNextPageError ? (
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
                    ) : linksQuery.isFetchingNextPage ? (
                      'Loading more links…'
                    ) : linksQuery.hasNextPage ? null : (
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
          refreshAfterBulkAction();
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
            draft={filterDraft}
            onDraftChange={setFilterDraft}
            setNewQuery={setNewQuery}
            userOrgs={userOrgs}
            userPrivileges={userPrivileges}
          />
        </SheetContent>
      </Sheet>

      <BulkLinkActions
        selectedIds={selectedLinkIds}
        actorId={netid}
        canCreate={
          userPrivileges.has('admin') || userPrivileges.has('facstaff')
        }
        shareDisabled={shareDisabled}
        transferDisabled={transferDisabled}
        deleteDisabled={deleteDisabled}
        allVisibleSelected={allVisibleSelected}
        someVisibleSelected={someVisibleSelected}
        onToggleVisible={toggleVisibleSelection}
        totalVisible={linkInfo?.length ?? 0}
        visibleSelectedCount={visibleSelectedCount}
        onClear={clearSelection}
        onRefresh={refreshAfterBulkAction}
      />
    </div>
  );
}
