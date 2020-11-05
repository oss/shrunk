# shrunk - Rutgers University URL Shortener

"""Database-level interactions for shrunk."""

from typing import Optional, List, Set, Any
from datetime import datetime

import pymongo

from .search import SearchClient
from .geoip import GeoipClient
from .orgs import OrgsClient
from .tracking import TrackingClient
from .roles import RolesClient
from .links import LinksClient

__all__ = ['ShrunkClient']


class ShrunkClient:
    def __init__(self,
                 DB_HOST: str,
                 DB_PORT: int = 27017,
                 DB_NAME: str = 'shrunk',
                 DB_USERNAME: Optional[str] = None,
                 DB_PASSWORD: Optional[str] = None,
                 GEOLITE_PATH: Optional[str] = None,
                 RESERVED_WORDS: Optional[Set[str]] = None,
                 BANNED_REGEXES: Optional[List[str]] = None,
                 REDIRECT_CHECK_TIMEOUT: Optional[float] = 0.5,
                 **_kwargs: Any):
        self.conn = pymongo.MongoClient(DB_HOST, DB_PORT, username=DB_USERNAME,
                                        password=DB_PASSWORD, authSource='admin',
                                        connect=False, tz_aware=True)
        self.db = self.conn[DB_NAME]
        self._ensure_indexes()

        self.geoip = GeoipClient(GEOLITE_PATH=GEOLITE_PATH)
        self.links = LinksClient(db=self.db, geoip=self.geoip,
                                 RESERVED_WORDS=RESERVED_WORDS or set(),
                                 BANNED_REGEXES=BANNED_REGEXES or [],
                                 REDIRECT_CHECK_TIMEOUT=REDIRECT_CHECK_TIMEOUT or 0.5)
        self.roles = RolesClient(db=self.db)
        self.tracking = TrackingClient(db=self.db)
        self.orgs = OrgsClient(db=self.db)
        self.search = SearchClient(db=self.db)

    def _ensure_indexes(self) -> None:
        self.db.urls.create_index([('aliases.alias', pymongo.ASCENDING)])
        self.db.urls.create_index([('netid', pymongo.ASCENDING)])
        self.db.visits.create_index([('link_id', pymongo.ASCENDING)])
        self.db.visits.create_index([('source_ip', pymongo.ASCENDING)])
        self.db.visitors.create_index([('ip', pymongo.ASCENDING)], unique=True)
        self.db.organizations.create_index([('name', pymongo.ASCENDING)], unique=True)
        self.db.organizations.create_index([('members.name', pymongo.ASCENDING),
                                            ('members.netid', pymongo.ASCENDING)])

    def user_exists(self, netid: str) -> bool:
        """Check whether there exist any links belonging to a user.
        :param netid: The user's NetID."""
        return self.db.urls.find_one({'netid': netid}) is not None

    def reset_database(self) -> None:
        for col in ['grants', 'organizations', 'urls', 'visitors', 'visits']:
            self.db[col].delete_many({})

    def admin_stats(self, begin: Optional[datetime] = None, end: Optional[datetime] = None) -> Any:
        if begin is None and end is None:
            # estimated_document_count() is MUCH faster than count_documents({})
            num_links = self.db.urls.estimated_document_count()
            num_visits = self.db.visits.estimated_document_count()
            num_users = next(self.db.urls.aggregate([
                {'$project': {'netid': 1}},
                {'$group': {'_id': '$netid'}},
                {'$count': 'count'},
            ]))['count']
        elif begin is not None and end is not None:
            def match_range(field_name: str) -> Any:
                return {'$and': [
                    {field_name: {'$gte': begin}},
                    {field_name: {'$lte': end}},
                ]}
            num_links = self.db.urls.count_documents(match_range('timeCreated'))
            num_visits = self.db.visits.count_documents(match_range('time'))
            num_users = next(self.db.urls.aggregate([
                {'$match': match_range('timeCreated')},
                {'$project': {'netid': 1}},
                {'$group': {'_id': '$netid'}},
                {'$count': 'count'},
            ]))['count']
        else:
            raise ValueError(f'Invalid input begin={begin} end={end}')

        return {
            'links': num_links,
            'visits': num_visits,
            'users': num_users,
        }

    def endpoint_stats(self) -> List[Any]:
        return list(self.db.endpoint_statistics.aggregate([
            {'$match': {
                '$and': [
                    {'endpoint': {'$ne': 'shrunk.render_index'}},
                    {'endpoint': {'$ne': 'shrunk.render_login'}},
                    {'endpoint': {'$ne': 'sso_login'}},
                    {'endpoint': {'$ne': 'static'}},
                    {'endpoint': {'$ne': 'redirect_link'}},
                    {'endpoint': {'$ne': 'error'}},
                ],
            }},
            {'$group': {
                '_id': '$endpoint',
                'total_visits': {'$sum': '$count'},
                'unique_visits': {'$sum': 1},
            }},
            {'$project': {
                '_id': 0,
                'endpoint': '$_id',
                'total_visits': 1,
                'unique_visits': 1,
            }},
        ]))

    def record_visit(self, netid: str, endpoint: str) -> None:
        self.db.endpoint_statistics.find_one_and_update(
            {'endpoint': endpoint, 'netid': netid},
            {'$set': {'endpoint': endpoint, 'netid': netid},
             '$inc': {'count': 1}},
            upsert=True)