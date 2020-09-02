# shrunk - Rutgers University URL Shortener

import enum
import math
import datetime

from pymongo.collation import Collation


class SortOrder(enum.IntEnum):
    TIME_DESC = 0
    """Sort by creation time, descending."""

    TIME_ASC = 1
    """Sort by creation time, ascending."""

    TITLE_ASC = 2
    """Sort by title, alphabetically."""

    TITLE_DESC = 3
    """Sort by title, reverse-alphabetically."""

    POP_ASC = 4
    """Sort by popularity (total number of visits), ascending."""

    POP_DESC = 5
    """Sort by popularity (total number of visits), descending."""


# TODO: this is a good candidate for a @dataclass when/if we move to python 3.7
class Pagination:
    def __init__(self, page, links_per_page):
        self.page = page
        self.links_per_page = links_per_page

    def num_pages(self, total_results):
        total_results = max(1, total_results)
        return math.ceil(total_results / self.links_per_page)


class SearchResults:
    def __init__(self, results, total_results,
                 page=None, begin_page=None, end_page=None, total_pages=None):
        self.results = results
        self.total_results = total_results
        self.page = page
        self.begin_page = begin_page
        self.end_page = end_page
        self.total_pages = total_pages

    def __len__(self):
        return len(self.results)

    def __iter__(self):
        return iter(self.results)


class SearchClient:
    """Mixin for search-related operations."""

    def __init__(self, **kwargs):
        pass

    def search(self, *, query=None, netid=None, org=None, sort=None, pagination=None,
               show_deleted=False, show_expired=False):
        pipeline = []

        if netid is not None:
            pipeline.append({'$match': {'netid': netid}})

        # if an org filter exists, we run the aggregation on the organization_members
        # collection instead of the urls collection. But the output of this stage
        # is just a bunch of URL documents, so the downstream stages don't know the
        # difference.
        if org is not None:
            pipeline.append({'$match': {'name': org}})
            pipeline.append({'$unwind': '$members'})
            pipeline.append({
                '$lookup': {
                    'from': 'urls',
                    'localField': 'members.netid',
                    'foreignField': 'netid',
                    'as': 'urls'
                }
            })
            pipeline.append({'$unwind': '$urls'})
            pipeline.append({'$replaceRoot': {'newRoot': '$urls'}})

        if query is not None:
            match = {
                '$regex': query,
                '$options': 'i'
            }

            pipeline.append({
                '$match': {
                    '$or': [
                        {'short_url': match},
                        {'long_url': match},
                        {'title': match},
                        {'netid': match}
                    ]
                }
            })

        if sort is not None:
            try:
                sort = int(sort)
            except ValueError:
                raise IndexError('Invalid sort order.')

            if sort == SortOrder.TIME_ASC:
                sort_exp = {'timeCreated': 1}
            elif sort == SortOrder.TIME_DESC:
                sort_exp = {'timeCreated': -1}
            elif sort == SortOrder.TITLE_ASC:
                sort_exp = {'title': 1}
            elif sort == SortOrder.TITLE_DESC:
                sort_exp = {'title': -1}
            elif sort == SortOrder.POP_ASC:
                sort_exp = {'visits': 1}
            elif sort == SortOrder.POP_DESC:
                sort_exp = {'visits': -1}
            else:
                raise IndexError('Invalid sort order.')
            pipeline.append({
                '$sort': sort_exp
            })

        if not show_deleted:
            pipeline.append({'$match': {'deleted': {'$ne': True}}})

        if not show_expired:
            now = datetime.datetime.now()
            pipeline.append({'$match': {'$or': [
                {'expiration_time': None},
                {'expiration_time': {'$gte': now}}
            ]}})

        facet = {
            'count': [{'$count': 'count'}],
            'result': [{'$skip': 0}]  # because this can't be empty
        }

        if pagination is not None:
            num_skip = (pagination.page - 1) * pagination.links_per_page
            facet['result'] = [
                {'$skip': num_skip},
                {'$limit': pagination.links_per_page}
            ]

        pipeline.append({
            '$facet': facet
        })

        if org is not None:
            cur = next(self.db.organizations.aggregate(pipeline, collation=Collation('en')))
        else:
            cur = next(self.db.urls.aggregate(pipeline, collation=Collation('en')))

        result = cur['result']
        count = cur['count'][0]['count'] if cur['count'] else 0
        return SearchResults(result, count)
