"""Implements the :py:class:`SearchClient` class."""

from typing import Any, List
from datetime import datetime, timezone

from pymongo.collation import Collation
import pymongo

__all__ = ['SearchClient']


class SearchClient:
    """This class executes search queries."""

    def __init__(self, *, db: pymongo.database.Database, client: Any):
        self.db = db
        self.client = client

    def execute(self, user_netid: str, query: Any) -> Any:  # pylint: disable=too-many-branches,too-many-statements
        """Execute a search query

        :param user_netid: The NetID of the user performing the search
        :param query: The search query. See :py:mod:`shrunk.api.search` for
          the search query format
        """

        # We're going to build up an aggregation pipeline based on the submitted query.
        # This pipeline will be executed on the organizations collection if set.set == 'org',
        # or on the urls collection otherwise.
        pipeline: List[Any] = []

        # Filter based on search string, if provided.
        if 'query' in query and query['query'] != '' and query['set']['set'] != 'shared':
            pipeline += [
                {'$match': {'$text': {'$search': query['query']}}},
                {'$addFields': {'text_search_score': {'$meta': 'textScore'}}},
            ]

        # Filter the appropriate links set.
        if query['set']['set'] == 'user':  # search within `user_netid`'s links
            pipeline.append({'$match': {'netid': user_netid}})
        elif query['set']['set'] == 'shared':
            # If the set is 'shared', the pipeline will be executed against the 'organizations'
            # collection instead of the 'urls' collection.
            if 'query' in query and query['query'] != '':
                pipeline += [
                    {'$match': {'members.netid': user_netid}},
                    {'$lookup': {
                        'from': 'urls',
                        'let': {'org_id':'$_id'},
                        'pipeline' : [
                            {'$match': {'$text': {'$search': query['query']}}},
                            {'$addFields': {'text_search_score': {'$meta': 'textScore'}}},
                            {'$unwind': '$viewers'},
                            {'$match': {'$expr':{'$eq':['$viewers._id','$$org_id']}}},
                            {'$match': {'text_search_score': {'$gt': 0.5}}},
                        ],
                        'as': 'shared_urls',
                    }},
                    {'$unwind': '$shared_urls'},
                    {'$replaceRoot': {'newRoot': '$shared_urls'}},
                    {'$unionWith': {
                                    'coll': 'urls',
                                    'pipeline': [{'$match': {'$text': {'$search': query['query']}}},
                                                {'$addFields': {'text_search_score': {'$meta': 'textScore'}}},
                                                {'$match': {'viewers._id': user_netid}},
                                                {'$match': {'text_search_score': {'$gt': 0.5}}}]
                                }}] 
            else:
                pipeline += [
                    {'$match': {'members.netid': user_netid}},
                    {'$lookup': {
                        'from': 'urls',
                        'localField': '_id',
                        'foreignField': 'viewers._id',
                        'as': 'shared_urls',
                    }},
                    {'$unwind': '$shared_urls'},
                    {'$replaceRoot': {'newRoot': '$shared_urls'}},
                    {'$unionWith': {
                        'coll': 'urls',
                        'pipeline': [{'$match': {'viewers._id': user_netid}}]
                    }}]
        elif query['set']['set'] == 'org':  # search within the given org
            pipeline.append({'$match': {'viewers.type': 'org', 'viewers._id': query['set']['org']}})

        # Sort results.
        sort_order = 1 if query['sort']['order'] == 'ascending' else -1
        if query['sort']['key'] == 'created_time':
            sort_key = 'timeCreated'
        elif query['sort']['key'] == 'title':
            sort_key = 'title'
        elif query['sort']['key'] == 'visits':
            sort_key = 'visits'
        elif query['sort']['key'] == 'relevance':
            sort_key = 'text_search_score'
        else:
            # This should never happen
            raise RuntimeError(f'Bad sort key {query["sort"]["key"]}')
        pipeline.append({'$sort': {sort_key: sort_order, '_id': sort_order}})

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

        if 'begin_time' in query:
            pipeline.append({'$match': {'timeCreated': {'$gte': query['begin_time']}}})

        if 'end_time' in query:
            pipeline.append({'$match': {'timeCreated': {'$lte': query['end_time']}}})

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
        if query['set']['set'] == 'shared':
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
                expiration_time = res['expiration_time']
            else:
                expiration_time = None

            prepared = {
                'id': res['_id'],
                'title': res['title'],
                'long_url': res['long_url'],
                'created_time': res['timeCreated'],
                'expiration_time': expiration_time,
                'visits': res['visits'],
                'unique_visits': res.get('unique_visits', 0),
                'owner': res['netid'],
                'aliases': [alias for alias in res['aliases'] if is_alias_visible(alias)],
                'is_expired': res['is_expired'],
                'may_edit': self.client.links.may_edit(res['_id'], user_netid),
            }

            if res.get('deleted'):
                prepared['deletion_info'] = {
                    'deleted_by': res['deleted_by'],
                    'deleted_time': res['deleted_time'],
                }
            
            return prepared

        result = next(cursor)
        count = result['count'][0]['count'] if result['count'] else 0
        results = [prepare_result(res) for res in result['result']]

        # Remove possible duplicates in results and update total count
        unique = { each['id'] : each for each in results}.values()
        unique_results = list(unique)
        diff = len(results) - len(unique_results)
        count = count - diff

        return {
            'count': count,
            'results': unique_results,
        }