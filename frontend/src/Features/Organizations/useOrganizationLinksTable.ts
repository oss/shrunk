import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useLinkSelection } from '@/Features/Links/useLinkSelection';
import { useOrganizationLinks } from '@/Features/Organizations/useOrganizationLinks';
import { DEFAULT_ORGANIZATION_LINK_QUERY } from '@/Features/Organizations/OrganizationSearch';

export function useOrganizationLinksTable(orgId: string, isAdmin?: boolean) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState(DEFAULT_ORGANIZATION_LINK_QUERY);
  const organizationLinks = useOrganizationLinks(orgId);

  const visibleLinks = useMemo(() => {
    const normalize = (value: string | undefined) =>
      (value ?? '').trim().toLocaleLowerCase();
    const matches = (value: string | undefined, search: string) =>
      normalize(value).includes(normalize(search));
    const filtered = organizationLinks.links.filter((link) => {
      const createdTime = dayjs(link.created_time);
      const owner = link.owner.org_name ?? link.owner._id;
      return (
        matches(link.title, query.title) &&
        matches(link.alias, query.alias) &&
        matches(link.long_url, query.url) &&
        matches(owner, query.owner) &&
        query.roles.includes(link.role) &&
        (query.showExpiredLinks || !link.is_expired) &&
        (isAdmin === true && query.showDeletedLinks ? true : !link.deleted) &&
        (query.showType === 'tracking_pixels'
          ? link.is_tracking_pixel_link
          : !link.is_tracking_pixel_link) &&
        (!query.beginTime || !createdTime.isBefore(query.beginTime)) &&
        (!query.endTime || !createdTime.isAfter(query.endTime))
      );
    });

    if (query.sort.key === 'relevance') return filtered;
    const direction = query.sort.order === 'ascending' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (query.sort.key === 'created_time') {
        return (
          direction *
          (dayjs(a.created_time).valueOf() - dayjs(b.created_time).valueOf())
        );
      }
      if (query.sort.key === 'title') {
        return direction * a.title.localeCompare(b.title);
      }
      return direction * ((a.visits ?? 0) - (b.visits ?? 0));
    });
  }, [isAdmin, organizationLinks.links, query]);

  const totalPages = Math.ceil(visibleLinks.length / pageSize);
  const paginatedLinks = useMemo(
    () =>
      visibleLinks.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, pageSize, visibleLinks],
  );
  const selection = useLinkSelection(paginatedLinks);

  useEffect(() => setCurrentPage(1), [pageSize, query]);

  return {
    ...organizationLinks,
    ...selection,
    query,
    setQuery,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginatedLinks,
    totalPages,
  };
}
