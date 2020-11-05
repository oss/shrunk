from typing import Any, List
from datetime import datetime, timezone

from pymongo.collation import Collation
import pymongo

__all__ = ['SearchClient']


class SearchClient:
    def __init__(self, *, db: pymongo.database.Database):
        self.db = db

    def execute(self, user_netid: str, query: Any) -> Any:
        # We're going to build up an aggregation pipeline based on the submitted query.
        # This pipeline will be executed on the organizations collection if set.set == 'org',
        # or on the urls collection otherwise.
        pipeline: List[Any] = []

        # Filter the appropriate links set.
        if query['set']['set'] == 'user':  # search within `user_netid`'s links
            pipeline.append({'$match': {'netid': user_netid}})
        elif query['set']['set'] == 'org':  # search within the given org
            # Since set.set == 'org', we're going to run `pipeline` against the
            # organizations collection. However, the output of the pipeline stages
            # in this branch is just a collection of URL documents, so later stages
            # in the pipeline won't know the difference.
            pipeline += [
                {'$match': {'name': query['set']['org']}},  # match org name
                {'$unwind': '$members'},  # get org members
                {'$lookup': {  # join members with urls
                    'from': 'urls',
                    'localField': 'members.netid',
                    'foreignField': 'netid',
                    'as': 'urls',
                }},
                {'$unwind': '$urls'},
                {'$replaceRoot': {'newRoot': '$urls'}},
            ]

        # Filter based on search string, if provided.
        if 'query' in query:
            match = {
                '$regex': query['query'],
                '$options': 'i',  # case insensitive
            }

            pipeline.append({
                '$match': {
                    '$or': [
                        {'long_url': match},
                        {'title': match},
                        {'aliases.alias': match},
                    ],
                },
            })

        # Sort results.
        sort_order = 1 if query['sort']['order'] == 'ascending' else -1
        if query['sort']['key'] == 'created_time':
            sort_key = 'timeCreated'
        elif query['sort']['key'] == 'title':
            sort_key = 'title'
        elif query['sort']['key'] == 'visits':
            sort_key = 'visits'
        else:
            assert False  # should never happen
        pipeline.append({'$sort': {sort_key: sort_order}})

        # Add is_expired field
        now = datetime.now(timezone.utc)
        pipeline.append({
            '$addFields': {
                'is_expired': {
                    '$and': [
                        {'$toBool': '$expiration_time'},
                        {'$gte': [now, '$expiration_time']},
                    ],
                },
            },
        })

        if not query.get('show_deleted_links', False):
            pipeline.append({'$match': {'deleted': {'$ne': True}}})

        if not query.get('show_expired_links', False):
            pipeline.append({'$match': {'is_expired': False}})

        # Pagination.
        facet = {
            'count': [{'$count': 'count'}],
            'result': [{'$skip': 0}],
        }
        if 'pagination' in query:
            facet['result'] = [
                {'$skip': query['pagination']['skip']},
                {'$limit': query['pagination']['limit']},
            ]
        pipeline.append({'$facet': facet})

        # Execute the query. Make sure we use the 'en' collation so strings
        # are sorted properly (e.g. wrt case and punctuation).
        if query['set']['set'] == 'org':
            cursor = self.db.organizations.aggregate(pipeline, collation=Collation('en'))
        else:
            cursor = self.db.urls.aggregate(pipeline, collation=Collation('en'))

        def prepare_result(res: Any) -> Any:
            """Turn a result from the DB into something than can be JSON-serialized."""
            def is_alias_visible(alias: Any) -> bool:
                if query.get('show_deleted_links', False):
                    return True
                return not alias['deleted']

            if res.get('expiration_time'):
                expiration_time = res['expiration_time'].isoformat()
            else:
                expiration_time = None

            prepared = {
                'id': str(res['_id']),
                'title': res['title'],
                'long_url': res['long_url'],
                'created_time': res['timeCreated'].isoformat(),
                'expiration_time': expiration_time,
                'visits': res['visits'],
                'unique_visits': res.get('unique_visits', 0),
                'owner': res['netid'],
                'aliases': [alias for alias in res['aliases'] if is_alias_visible(alias)],
                'is_expired': res['is_expired'],
            }

            if res.get('deleted'):
                prepared['deletion_info'] = {
                    'deleted_by': res['deleted_by'],
                    'deleted_time': res['deleted_time'].isoformat(),
                }

            return prepared

        result = next(cursor)
        count = result['count'][0]['count'] if result['count'] else 0
        results = [prepare_result(res) for res in result['result']]

        return {
            'count': count,
            'results': results,
        }