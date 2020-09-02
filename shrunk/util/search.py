import functools

import flask

from ..util import get_param
from ..client import Pagination


def display_links_set(links_set):
    """ Get a human-readable name for links_set. """
    if links_set == 'GO!my':
        return 'My links'
    if links_set == 'GO!all':
        return 'All links'
    return links_set


def authorized_for_links_set(client, links_set, netid):
    """ Test whether the user is authorized to view links_set. """
    if client.check_role('admin', netid):
        return True
    if links_set == 'GO!my':
        return True
    if links_set == 'GO!all':
        return False  # only admin is authorized, and that case is handled above
    return bool(client.may_manage_organization(links_set, netid))


def paginate(cur_page, total_pages):
    """ Compute the range of pages that should be displayed to the user. """
    if total_pages <= 9:
        return (1, total_pages)
    if cur_page < 5:  # display first 9 pages
        return (1, 9)
    if cur_page > total_pages - 4:  # display last 9 pages
        return (total_pages - 8, total_pages)
    return (cur_page - 4, cur_page + 4)  # display current page +- 4 adjacent pages


def validate_page(page):
    try:
        page = int(page)
        return page >= 1
    except ValueError:
        return False


def search(netid, client, request, session, show_deleted, should_paginate=True):
    old_query = session.get('query')
    query = get_param('query', request, session)
    old_links_set = session.get('links_set')
    links_set = get_param('links_set', request, session, default='GO!my')
    old_show_expired_links = session.get('show_expired_links', False)
    show_expired_links = get_param('show_expired_links', request, session, processor=lambda x: x == 'true')
    sort = get_param('sortby', request, session, default='0',
                     validator=lambda x: x in map(str, range(6)))
    page = int(get_param('page', request, session, default='1', validator=validate_page))
    if query != old_query or links_set != old_links_set or show_expired_links != old_show_expired_links:
        page = 1

    # links_set determines which set of links we show the user.
    # valid values of links_set are:
    #   GO!my  --- show the user's own links
    #   GO!all --- show all links
    #   <org>, where <org> is the name of an organization of which
    #      the user is a member --- show all links belonging to members of <org>

    if not authorized_for_links_set(client, links_set, netid):
        links_set = 'GO!my'
    session['links_set'] = links_set

    def do_search(page):
        if should_paginate:
            pagination = Pagination(page, flask.current_app.config['MAX_DISPLAY_LINKS'])
        else:
            pagination = None
        p = functools.partial(client.search, sort=sort, pagination=pagination,
                              show_deleted=show_deleted, show_expired=show_expired_links)

        if links_set == 'GO!my':
            results = p(query=query, netid=netid)
        elif links_set == 'GO!all':
            results = p(query=query)
        else:
            results = p(query=query, org=links_set)

        if should_paginate:
            results.page = page
            results.total_pages = pagination.num_pages(results.total_results)
            results.begin_page, results.end_page = paginate(page, results.total_pages)
        return results

    results = do_search(page)
    if should_paginate and page > results.total_pages:
        session['page'] = str(results.total_pages)
        results = do_search(results.total_pages)
    results.links_set = links_set
    return results
