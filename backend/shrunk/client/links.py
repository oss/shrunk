"""Database-level interactions for shrunk."""
from datetime import datetime, timezone
import random
import string
import re
from typing import Optional, List, Set, Any, Dict, cast

from flask import current_app
import requests
import pymongo
from pymongo.collection import ReturnDocument
from pymongo.results import UpdateResult
from bson.objectid import ObjectId

from shrunk.util.string import get_domain
from . import aggregations

from .geoip import GeoipClient
from .exceptions import (NoSuchObjectException,
                         BadAliasException,
                         BadLongURLException)

__all__ = ['LinksClient']


class LinksClient:
    """A class for database interactions. This class defines core
    database-manipulation methods. Other methods are defined in the
    mixins classes from which this class inherits."""

    ALPHABET = string.digits + string.ascii_lowercase
    """The alphabet used for encoding short urls."""

    URL_MIN = 46656
    """The shortest allowable URL.

    This is the value of '1000' in the URL base encoding. Guarantees that all
    URLs are at least four characters long.
    """

    URL_MAX = 2821109907455
    """The longest allowable URL.

    This is the value of 'zzzzzzzz' in the URL base encoding. Guarantees that
    all URLs do not exceed eight characters.
    """

    def __init__(self, *,
                 db: pymongo.database.Database,
                 geoip: GeoipClient,
                 RESERVED_WORDS: Set[str],
                 BANNED_REGEXES: List[str],
                 REDIRECT_CHECK_TIMEOUT: float):
        self.db = db
        self.geoip = geoip
        self.reserved_words = RESERVED_WORDS
        self.banned_regexes = [re.compile(regex, re.IGNORECASE) for regex in BANNED_REGEXES]
        self.redirect_check_timeout = REDIRECT_CHECK_TIMEOUT

    def alias_is_reserved(self, alias: str) -> bool:
        """Check whether a string is a reserved word that cannot be used as a short url.
        :param url: the prospective short url."""
        if alias in self.reserved_words:
            return True
        return any(alias in str(route) for route in current_app.url_map.iter_rules())

    def _long_url_is_phished(self, long_url: str) -> bool:
        """Check whether the given long url is present in the phishing blacklist."""
        return self.db.phishTank.find_one({'url': long_url.rstrip()}) is not None

    def long_url_is_blocked(self, long_url: str) -> bool:
        """Check whether a url is blocked in the database or config file.
        :param long_url: The long url to query."""
        if any(regex.search(long_url) for regex in self.banned_regexes):
            return True
        if self._long_url_is_phished(long_url):
            return True
        domain = get_domain(long_url)
        if not domain:
            return False
        return self.db.grants.find_one({
            'role': 'blocked_url',
            'entity': {'$regex': '%s*' % domain},
        }) is not None

    def redirects_to_blocked_url(self, long_url: str) -> bool:
        """Follows the url to check whether it redirects to a blocked url.
        :param long_url: The long url to query
        """
        try:
            redirected_url = requests.head(long_url, allow_redirects=True, timeout=self.redirect_check_timeout).url
        except requests.exceptions.RequestException:
            return False
        return self.long_url_is_blocked(redirected_url)

    def id_of_alias(self, alias: str) -> Optional[ObjectId]:
        """Get the ``_id`` field associated with the short url.
        :param short_url: a short url
        :returns: An :py:class:`~bson.objectid.ObjectId` if the short url exists, or None otherwise."""
        result = self.db.urls.find_one({'aliases.alias': alias})
        return result['_id'] if result is not None else None

    def create(self,
               title: str,
               long_url: str,
               expiration_time: Optional[datetime],
               netid: str,
               creator_ip: str) -> ObjectId:
        if self.long_url_is_blocked(long_url):
            raise BadLongURLException

        if self.redirects_to_blocked_url(long_url):
            raise BadLongURLException

        document = {
            'title': title,
            'long_url': long_url,
            'timeCreated': datetime.now(timezone.utc),
            'visits': 0,
            'unique_visits': 0,
            'deleted': False,
            'creator_ip': creator_ip,
            'expiration_time': expiration_time,
            'netid': netid,
            'aliases': [],
        }

        result = self.db.urls.insert_one(document)
        return result.inserted_id

    def modify(self,
               link_id: ObjectId, *,
               title: Optional[str] = None,
               long_url: Optional[str] = None,
               expiration_time: Optional[datetime] = None) -> None:
        if long_url is not None and self.long_url_is_blocked(long_url):
            raise BadLongURLException

        if long_url is not None and self.redirects_to_blocked_url(long_url):
            raise BadLongURLException

        if title is None and long_url is None and expiration_time is None:
            return
        fields: Dict[str, Any] = {}
        if title is not None:
            fields['title'] = title
        if long_url is not None:
            fields['long_url'] = long_url
        if expiration_time is not None:
            fields['expiration_time'] = expiration_time
        result = self.db.urls.update_one({'_id': link_id}, {'$set': fields})
        if result.matched_count != 1:
            raise NoSuchObjectException

    def clear_visits(self, link_id: ObjectId) -> None:
        self.db.visits.delete_many({'link_id': link_id})
        self.db.urls.update_one({'_id': link_id},
                                {'$set': {
                                    'visits': 0,
                                    'unique_visits': 0}})

    def delete(self, link_id: ObjectId, deleted_by: str) -> None:
        result = self.db.urls.update_one({'_id': link_id, 'deleted': False},
                                         {'$set': {
                                             'deleted': True,
                                             'deleted_by': deleted_by,
                                             'deleted_time': datetime.now(timezone.utc),
                                         }})
        if result.modified_count != 1:
            raise NoSuchObjectException

    def remove_expiration_time(self, link_id: ObjectId) -> None:
        result = self.db.urls.update_one({'_id': link_id}, {'$set': {'expiration_time': None}})
        if result.matched_count != 1:
            raise NoSuchObjectException

    def delete_visits(self, link_id: ObjectId) -> None:
        self.db.visits.delete_many({'link_id': link_id})
        result = self.db.urls.update_one({'_id': link_id},
                                         {'$set': {'visits': 0, 'unique_visits': 0}})
        if result.modified_count != 1:
            raise NoSuchObjectException

    def get_daily_visits(self, link_id: ObjectId, alias: Optional[str] = None) -> List[Any]:
        """Given a short URL, return how many visits and new unique visitors it gets per day.
        :param short_url: A shortened URL
        :raises NoSuchLinkException: If the given short URL does not exist
        """

        if alias is None:
            match = {'$match': {'link_id': link_id}}
        else:
            match = {'$match': {'link_id': link_id, 'alias': alias}}

        aggregation = [match] + cast(List[Any], aggregations.daily_visits_aggregation)
        return list(self.db.visits.aggregate(aggregation))

    def get_geoip_stats(self, link_id: Optional[ObjectId] = None, alias: Optional[str] = None) -> Any:
        if alias is not None:
            assert link_id is not None

        aggregation = []
        if link_id is not None:
            if alias is None:
                match = {'$match': {'link_id': link_id}}
            else:
                match = {'$match': {'link_id': link_id, 'alias': alias}}
            aggregation.append(match)
        aggregation.append({
            '$facet': {
                'us': [{'$match': {'country_code': 'US',
                                   'state_code': {'$exists': True, '$ne': None}}},
                       {'$group': {'_id': '$state_code', 'value': {'$sum': 1}}},
                       {'$addFields': {'code': '$_id'}},
                       {'$project': {'_id': 0}}],
                'world': [{'$match': {'country_code': {'$exists': True, '$ne': None}}},
                          {'$group': {'_id': '$country_code', 'value': {'$sum': 1}}},
                          {'$addFields': {'code': '$_id'}},
                          {'$project': {'_id': 0}}],
            },
        })
        return next(self.db.visits.aggregate(aggregation))

    def get_overall_visits(self, link_id: ObjectId, alias: Optional[str] = None) -> Any:
        if alias is None:
            info = self.get_link_info(link_id)
            return {'total_visits': info['visits'], 'unique_visits': info.get('unique_visits', 0)}

        # If alias is not None, execute an aggregation to compute the stats.
        result = next(self.db.visits.aggregate([
            {'$match': {
                'link_id': link_id,
                'alias': alias,
            }},
            {'$facet': {
                'total_visits': [{'$count': 'count'}],
                'unique_visits': [{'$group': {'_id': '$tracking_id'}}, {'$count': 'count'}],
            }},
        ]))
        if not result['total_visits'] or not result['unique_visits']:
            return {'total_visits': 0, 'unique_visits': 0}
        return {
            'total_visits': result['total_visits'][0]['count'],
            'unique_visits': result['unique_visits'][0]['count'],
        }

    def get_visits(self, link_id: ObjectId, alias: Optional[str] = None) -> List[Any]:
        if alias is None:
            result = self.db.visits.find({'link_id': link_id})
        else:
            result = self.db.visits.find({'link_id': link_id, 'alias': alias})
        return list(result)

    def create_random_alias(self, link_id: ObjectId, description: str) -> str:
        while True:
            alias = self._generate_unique_key()
            while self.alias_is_reserved(alias):
                alias = self._generate_unique_key()
            try:
                result = self.db.urls.update_one({'_id': link_id},
                                                 {'$push': {'aliases': {
                                                     'alias': alias,
                                                     'description': description,
                                                     'deleted': False}}})
                if result.matched_count == 0:
                    raise NoSuchObjectException
                return alias
            except pymongo.errors.DuplicateKeyError:
                pass

    def create_or_modify_alias(self, link_id: ObjectId, alias: Optional[str], description: str) -> str:
        if alias is None:
            return self.create_random_alias(link_id, description)

        if self.alias_is_reserved(alias):
            raise BadAliasException

        # Try to un-delete the alias if it already exists on this link.
        result = self.db.urls.update_one({'_id': link_id, 'aliases.alias': alias},
                                         {'$set': {
                                             'aliases.$.deleted': False,
                                             'aliases.$.description': description}})
        if result.modified_count == 1:
            return alias

        # Otherwise, try to insert the alias. First check whether it already exsits.
        result = self.db.urls.find_one({'aliases.alias': alias})
        if result is not None:
            raise BadAliasException

        # Create the alias.
        self.db.urls.update_one({'_id': link_id},
                                {'$push': {
                                    'aliases': {
                                        'alias': alias,
                                        'description': description,
                                        'deleted': False}}})
        return alias

    def delete_alias(self, link_id: ObjectId, alias: str) -> None:
        result = self.db.urls.update_one({'_id': link_id, 'aliases.alias': alias},
                                         {'$set': {'aliases.$.deleted': True}})
        if result.modified_count != 1:
            raise NoSuchObjectException

    def get_owner(self, link_id: ObjectId) -> str:
        result = self.db.urls.find_one({'_id': link_id}, {'netid': 1})
        if result is None:
            raise NoSuchObjectException
        return cast(str, result['netid'])

    def is_owner(self, link_id: ObjectId, netid: str) -> bool:
        result = self.db.urls.find_one({'_id': link_id, 'netid': netid})
        return result is not None

    def may_view(self, link_id: ObjectId, netid: str) -> bool:
        # First check if the user owns the link
        if self.is_owner(link_id, netid):
            return True

        # Otherwise, check if the user and the link's owner share any organizations.
        owner_netid = self.get_owner(link_id)

        def match_netid(netid: str) -> Any:
            return [{'$match': {'members.netid': netid}}, {'$project': {'_id': 0, 'name': 1}}]

        result = next(self.db.organizations.aggregate([
            {'$facet': {
                'owner_orgs': match_netid(owner_netid),
                'viewer_orgs': match_netid(netid),
            }},
            {'$project': {'intersection': {'$setIntersection': ['$owner_orgs', '$viewer_orgs']}}},
            {'$project': {'owner_orgs': 0, 'viewer_orgs': 0}},
        ]))
        return len(result['intersection']) != 0 if result is not None else False

    def get_admin_stats(self) -> Any:
        """Get some basic overall stats about Shrunk
        """
        links = self.db.urls.count_documents({})
        visits = self.db.visits.estimated_document_count()
        users = self.db.urls.aggregate([
            {'$group': {'_id': '$netid'}},
            {'$count': 'count'},
        ])
        try:
            users = list(users)[0]['count']
        except (IndexError, KeyError):
            users = 0
        return {
            'links': links,
            'visits': visits,
            'users': users,
        }

    def get_endpoint_stats(self) -> List[Any]:
        """Summarizes of the information in the endpoint_statistics collection."""

        def ignore_endpoint(endpoint: str) -> Any:
            return {'$match': {'endpoint': {'$not': {'$eq': endpoint}}}}

        IGNORE_ENDPOINTS = ['redirect_link', 'static', 'redirect_to_real_index', 'shrunk.render_index',
                            'shrunk.render_login']

        return list(self.db.endpoint_statistics.aggregate([
            {'$group': {
                '_id': {'endpoint': '$endpoint'},
                'total_visits': {'$sum': '$count'},
                'unique_visits': {'$sum': 1}}},
            {'$addFields': {'endpoint': '$_id.endpoint'}},
            {'$project': {'_id': 0}}] + [ignore_endpoint(ep) for ep in IGNORE_ENDPOINTS]))

    def get_link_info(self, link_id: ObjectId) -> Any:
        result = self.db.urls.find_one({'_id': link_id})
        if result is None:
            raise NoSuchObjectException
        return result

    def get_link_info_by_alias(self, alias: str) -> Any:
        return self.db.urls.find_one({'aliases.alias': alias})

    def get_long_url(self, alias: str) -> Optional[str]:
        """Given a short URL, returns the long URL.

        Performs a case-insensitive search for the corresponding long URL.

        :param short_url: A shortened URL

        :returns:
          The long URL, or None if the short URL does not exist.
        """
        result = self.get_link_info_by_alias(alias)

        # Fail if the link does not exist
        if result is None:
            return None

        # Fail if the link exists in the database but has been deleted
        if result.get('deleted'):
            return None

        # Check that the alias through which we're accessing the link isn't deleted
        for alias_info in result['aliases']:
            if alias_info['alias'] == alias and alias_info['deleted']:
                return None

        # Fail if the link exists but has expired
        expiration_time = result.get('expiration_time')
        current_time = datetime.now(timezone.utc)
        if expiration_time and current_time >= expiration_time:
            return None

        # Link exists and is valid; return its long URL
        return cast(str, result['long_url'])

    def visit(self,
              alias: str,
              tracking_id: Optional[str],
              source_ip: str,
              user_agent: Optional[str],
              referer: Optional[str]) -> None:
        """Visits the given URL and logs visit information.

        On visiting a URL, this is guaranteed to perform at least the following
        side effects if the short URL is valid:

          - Increment the hit counter
          - Log the visitor

        If the URL is invalid, no side effects will occur.

        :param short_url: The short URL visited
        :param tracking_id: The contents of the visitor's tracking cookie, if any
        :param source_ip: The client's IP address
        :param user_agent: The client's user agent
        :param referer: The client's referer

        """

        resp = self.db.urls.find_one({'aliases.alias': alias})
        if not self.db.visits.find_one({'link_id': resp['_id'], 'tracking_id': tracking_id}):
            self.db.urls.update_one({'aliases.alias': alias},
                                    {'$inc': {'visits': 1, 'unique_visits': 1}})
        else:
            self.db.urls.update_one({'aliases.alias': alias}, {'$inc': {'visits': 1}})

        state_code, country_code = self.geoip.get_location_codes(source_ip)
        self.db.visits.insert_one({
            'link_id': resp['_id'],
            'alias': alias,
            'tracking_id': tracking_id,
            'source_ip': source_ip,
            'time': datetime.now(timezone.utc),
            'user_agent': user_agent,
            'referer': referer,
            'state_code': state_code,
            'country_code': country_code,
        })

    def get_visitor_id(self, ipaddr: str) -> str:
        """Gets a unique, opaque identifier for an IP address.

        :param ipaddr: a string containing an IPv4 address.

        :returns:
          A hexadecimal string which uniquely identifies the given IP address.
        """
        rec = {'ip': str(ipaddr)}
        res = self.db.visitors.find_one_and_update(rec, {'$setOnInsert': {'ip': str(ipaddr)}},
                                                   upsert=True,
                                                   return_document=ReturnDocument.AFTER)
        return str(res['_id'])

    def blacklist_user_links(self, netid: str) -> UpdateResult:
        return self.db.urls.update_many({'netid': netid,
                                         'deleted': {'$ne': True}},
                                        {'$set': {'deleted': True,
                                                  'deleted_by': '!BLACKLISTED',
                                                  'deleted_time': datetime.now(timezone.utc)}})

    def unblacklist_user_links(self, netid: str) -> None:
        self.db.urls.update_many({'netid': netid,
                                  'deleted': True,
                                  'deleted_by': '!BLACKLISTED'},
                                 {'$set': {'deleted': False},
                                  '$unset': {'deleted_by': 1,
                                             'deleted_time': 1}})

    def block_urls(self, ids: List[ObjectId]) -> None:
        self.db.urls.update_many({'_id': {'$in': ids},
                                  'deleted': {'$ne': True}},
                                 {'$set': {'deleted': True,
                                           'deleted_by': '!BLOCKED',
                                           'deleted_time': datetime.now(timezone.utc)}})

    def unblock_urls(self, ids: List[ObjectId]) -> None:
        self.db.urls.update_many({'_id': {'$in': ids},
                                  'deleted': True,
                                  'deleted_by': '!BLOCKED'},
                                 {'$set': {'deleted': False},
                                  '$unset': {'deleted_by': 1,
                                             'deleted_time': 1}})

    @classmethod
    def _generate_unique_key(cls) -> str:
        """Generates a unique key."""

        return cls._base_encode(random.randint(cls.URL_MIN, cls.URL_MAX))

    @classmethod
    def _base_encode(cls, integer: int) -> str:
        """Encodes an integer into our arbitrary link alphabet.

        Given an integer, convert it to base-36. Letters are case-insensitive;
        this function uses uppercase arbitrarily.

        :param integer: An integer.

        :returns:
          A string composed of characters from :py:attr:`BaseClient.ALPHABET`.
        """

        length = len(cls.ALPHABET)
        result = []
        while integer != 0:
            result.append(cls.ALPHABET[integer % length])
            integer //= length

        return ''.join(reversed(result))