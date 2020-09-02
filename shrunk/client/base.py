"""Database-level interactions for shrunk."""
import datetime
import random
import string
from typing import Optional, Iterable  # , Final, TypedDict

import flask
import pymongo
from pymongo.collection import ReturnDocument
from pymongo.results import UpdateResult
from bson.objectid import ObjectId

from .. import aggregations
# from .. import schema
from ..util.string import get_domain

from .exceptions import BadShortURLException, DuplicateIdException, \
    ForbiddenNameException, ForbiddenDomainException, AuthenticationException, \
    NoSuchLinkException
from .search import SearchResults


# class DateSpec(TypedDict):
#     day: int
#     month: int
#     year: int


# class DailyVisits(TypedDict):
#     _id: DateSpec
#     """The date to which these data pertain."""

#     first_time_visits: int
#     """The number of first-time visitors on this date."""

#     all_visits: int
#     """The total number of visits up to this date."""


# class AdminStats(TypedDict):
#     visits: int
#     """The total number of redirects Shrunk has performed"""

#     users: int
#     """The total number of distinct users that have created links"""

#     links: int
#     """The total number of URLs shortened"""


# class EndpointStats(TypedDict):
#     endpoint: str
#     """The endpoint name."""

#     total_visits: int
#     """The total number of requests to the endpoint."""

#     unique_visits: int
#     """The number of unique (by NetID) requests to the endpoint."""


class BaseClient:
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
                 DB_HOST: Optional[str] = None,
                 DB_PORT: Optional[int] = 27017,
                 DB_USERNAME: Optional[str] = None,
                 DB_PASSWORD: Optional[str] = None,
                 DB_REPLSET: Optional[str] = None,
                 DB_NAME: str = 'shrunk',
                 GEOLITE_PATH: Optional[str] = None,
                 TESTING: bool = False,
                 **config) -> None:
        """
        :param DB_HOST: the hostname to connect to; defaults to ``"localhost"``
        :param DB_PORT: the port to connect to on the server; defaults to 27017
        :param GEOLITE_PATH: path to geolite ip database
        :param DB_USERNAME: username to login to database
        :param DB_PASSWORD: password to login to database
        """

        self._DB_NAME = DB_NAME
        self._TESTING = TESTING
        self._DB_CONNECTION_STRING = None
        self._DB_USERNAME = DB_USERNAME
        self._DB_PASSWORD = DB_PASSWORD
        self._DB_HOST = DB_HOST
        self._DB_PORT = DB_PORT
        self._DB_REPLSET = DB_REPLSET

        self._mongo = pymongo.MongoClient(self._DB_HOST, self._DB_PORT,
                                          username=self._DB_USERNAME,
                                          password=self._DB_PASSWORD,
                                          authSource='admin', connect=False,
                                          replicaSet=self._DB_REPLSET)
        self.db = self._mongo[self._DB_NAME]

        self._create_indexes()

    def _create_indexes(self) -> None:
        self.db.urls.create_index([('short_url', pymongo.ASCENDING)], unique=True)
        self.db.urls.create_index([('netid', pymongo.ASCENDING)])
        self.db.visits.create_index([('link_id', pymongo.ASCENDING)])
        self.db.visits.create_index([('source_ip', pymongo.ASCENDING)])
        self.db.visitors.create_index([('ip', pymongo.ASCENDING)], unique=True)
        self.db.organizations.create_index([('name', pymongo.ASCENDING)], unique=True)
        self.db.organizations.create_index([('members.name', pymongo.ASCENDING),
                                            ('members.netid', pymongo.ASCENDING)])

    def user_exists(self, netid: str) -> bool:
        """Check whether there exist any links belonging to a user.

        :param netid: The user's NetID
        """

        return self.db.urls.count_documents({'netid': netid}) > 0

    def url_is_reserved(self, url: str) -> bool:
        """Check whether a string is a reserved word that cannot be used as a short url.

        :param url: the prospective short url
        """

        if url in flask.current_app.config.get('RESERVED_WORDS', []):
            return True
        return any(url in str(route) for route in flask.current_app.url_map.iter_rules())

    def drop_database(self) -> None:
        if self._TESTING:
            self._mongo.drop_database(self._DB_NAME)

    def reset_database(self) -> None:
        if self._TESTING:
            for col in ['grants', 'organizations', 'urls', 'visitors', 'visits']:
                self.db[col].delete_many({})

    def count_links(self, netid: Optional[str] = None) -> int:
        """Counts the number of created links.

        Gives a count on the number of created links for the given NetID. If no
        specific user is specified, this returns a global count for all users.

        :param netid:
          if `netid` is not `None`, count the links belonging to the specified user; otherwise,
          count the total number of links finds a global count
        """

        return self.db.urls.count_documents({'netid': netid} if netid is not None else {})

    def get_url_id(self, short_url: str) -> Optional[ObjectId]:
        """Get the ``_id`` field associated with the short url.

        :param short_url: a short url

        :returns:
          An :py:class:`~bson.objectid.ObjectId` if the short url exists, or None otherwise.
        """

        resp = self.db.urls.find_one({'short_url': short_url})
        return resp['_id'] if resp else None

    def is_phished(self, long_url: str) -> bool:
        """Check whether the given long url is present in the phishing blacklist."""

        return self.db.phishTank.find_one({'url': long_url.rstrip()}) is not None

    def create_short_url(self, long_url: str, short_url: Optional[str] = None,
                         netid: Optional[str] = None, title: Optional[str] = None,
                         creator_ip: Optional[str] = None, expiration_time: Optional[datetime.datetime] = None) -> str:
        """Randomly create a new short URL and updates the database.

        :param long_url: The original URL to shrink.
        :param short_url: A custom name for the short URL. A random one is generated if none is specified.
        :param netid: The creator of this URL.
        :param title: A descriptive title for this URL.

        :returns:
          The shortened URL.

        :raises ForbiddenNameException: If the requested name is a reserved word or
            has been banned by an administrator
        :raises DuplicateIdException: If the requested name is already taken
        """

        if self.is_blocked(long_url):
            raise ForbiddenDomainException('That URL is not allowed.')

        if self.is_phished(long_url):
            flask.current_app.logger.warning(f'User is attempting to create black listed url: {long_url}')
            raise ForbiddenDomainException('That URL is not allowed.')

        document = {
            'short_url': short_url,
            'long_url': long_url,
            'timeCreated': datetime.datetime.now(),
            'visits': 0,
            'deleted': False,
            'creator_ip': creator_ip
        }
        if netid is not None:
            document['netid'] = netid
        if title is not None:
            document['title'] = title
        if expiration_time is not None:
            document['expiration_time'] = expiration_time

        if short_url:
            # Attempt to insert the custom URL
            if self.url_is_reserved(short_url):
                raise ForbiddenNameException('That name is reserved.')

            try:
                response = self.db.urls.insert_one(document)
            except pymongo.errors.DuplicateKeyError:
                raise DuplicateIdException('That name already exists.')
        else:
            # Generate a unique key and update MongoDB
            response = None
            while response is None:
                try:
                    url = self._generate_unique_key()
                    while self.url_is_reserved(url):
                        url = self._generate_unique_key()

                    document['short_url'] = url
                    response = self.db.urls.insert_one(document)
                except pymongo.errors.DuplicateKeyError:
                    continue

        return str(document['short_url'])

    def modify_url(self, *, title: Optional[str] = None, long_url: Optional[str] = None,
                   short_url: Optional[str] = None, expiration_time: Optional[str] = None, old_short_url: str) -> UpdateResult:
        """Modifies an existing URL.

        Edits the values of the url `old_short_url` and replaces them with the
        values specified in the keyword arguments.

        :param title: The new title
        :param long_url: The new long url
        :param short_url: The new short url (may be same as old_short_url)
        :param old_short_url: The old short url
        """

        if long_url is not None and self.is_blocked(long_url):
            raise ForbiddenDomainException('That URL is not allowed.')

        if long_url is not None and self.is_phished(long_url):
            flask.current_app.logger.warning(f'User is attempting to create black-listed url: {long_url}')
            raise ForbiddenDomainException('That URL is not allowed')

        if short_url is not None and self.url_is_reserved(short_url):
            raise ForbiddenNameException('That name is reserved.')

        new_doc = {}
        if title is not None:
            new_doc['title'] = title
        if long_url is not None:
            new_doc['long_url'] = long_url
        if short_url is not None:
            new_doc['short_url'] = short_url
        new_doc['expiration_time'] = expiration_time

        try:
            return self.db.urls.update_one({'short_url': old_short_url}, {'$set': new_doc})
        except pymongo.errors.DuplicateKeyError:
            raise BadShortURLException('That name already exists.')

    def is_owner_or_admin(self, short_url: str, request_netid: str) -> bool:
        """Returns True if request_netid is an admin, or if short_url exists and
            request_netid is the owner of short_url. """
        if self.check_role('admin', request_netid):
            return True
        info = self.get_url_info(short_url)
        return info is not None and info['netid'] == request_netid

    def delete_url(self, short_url: str, request_netid: str) -> UpdateResult:
        """Given a short URL, delete it from the database.

        This deletes all information associated with the short URL and wipes all
        appropriate databases.

        :param short_url: The shortened URL to dete.
        :param request_netid: The netid of the user requesting to delete a link

        :returns:
          A response in JSON detailing the effect of the database operations.

        :raises AuthenticationException: If the user cannot edit the url
        :raises NoSuchLinkException: If the url does not exist
        """
        if not self.is_owner_or_admin(short_url, request_netid):
            raise AuthenticationException()

        link_id = self.get_url_id(short_url)
        if link_id is None:
            raise NoSuchLinkException()

        return self.db.urls.update_one({'short_url': short_url},
                                       {'$set': {'deleted': True,
                                                 'deleted_by': request_netid,
                                                 'deleted_time': datetime.datetime.now()}})

    def clear_visits(self, short_url: str, request_netid: str) -> None:
        if not self.is_owner_or_admin(short_url, request_netid):
            raise AuthenticationException()

        link_id = self.get_url_id(short_url)
        if link_id is None:
            raise NoSuchLinkException

        self.db.visits.delete_many({'link_id': link_id})
        self.db.urls.update_one({'_id': link_id}, {'$set': {'visits': 0, 'unique_visits': 0}})

    def get_url_info(self, short_url: str):  # -> Optional[schema.URLs]:
        """Given a short URL, return information about it.

        :param short_url: A shortened URL
        """
        return self.db.urls.find_one({'short_url': short_url})

    def get_daily_visits(self, short_url: str):  # -> Iterable[DailyVisits]:
        """Given a short URL, return how many visits and new unique visitors it gets per day.

        :param short_url: A shortened URL

        :raises NoSuchLinkException: If the given short URL does not exist
        """

        link_id = self.get_url_id(short_url)
        if link_id is None:
            raise NoSuchLinkException

        aggregation = [aggregations.match_link_id(link_id)] + aggregations.daily_visits_aggregation
        return self.db.visits.aggregate(aggregation)

    def get_admin_stats(self):  # -> AdminStats:
        """Get some basic overall stats about Shrunk
        """
        links = self.db.urls.count_documents({})
        visits = self.db.visits.estimated_document_count()
        users = self.db.urls.aggregate([
            {'$group': {'_id': '$netid'}},
            {'$count': 'count'}
        ])
        try:
            users = list(users)[0]['count']
        except (IndexError, KeyError):
            users = 0
        return {
            'links': links,
            'visits': visits,
            'users': users
        }

    def get_endpoint_stats(self):  # -> Iterable[EndpointStats]:
        """Summarizes of the information in the endpoint_statistics collection."""

        def ignore_endpoint(endpoint: str):
            return {'$match': {'endpoint': {'$not': {'$eq': endpoint}}}}

        IGNORE_ENDPOINTS = ['redirect_link', 'static', 'redirect_to_real_index', 'shrunk.render_index',
                            'shrunk.render_login']

        return self.db.endpoint_statistics.aggregate([
            {'$group': {
                '_id': {'endpoint': '$endpoint'},
                'total_visits': {'$sum': '$count'},
                'unique_visits': {'$sum': 1}}},
            {'$addFields': {'endpoint': '$_id.endpoint'}},
            {'$project': {'_id': 0}}] + [ignore_endpoint(ep) for ep in IGNORE_ENDPOINTS])

    def get_long_url(self, short_url: str) -> Optional[str]:
        """Given a short URL, returns the long URL.

        Performs a case-insensitive search for the corresponding long URL.

        :param short_url: A shortened URL

        :returns:
          The long URL, or None if the short URL does not exist.
        """
        result = self.get_url_info(short_url)

        # Fail if the link does not exist
        if result is None:
            return None

        # Fail if the link exists in the database but has been deleted
        if result.get('deleted'):
            return None

        # Fail if the link exists but has expired
        expiration_time = result.get('expiration_time')
        current_time = datetime.datetime.now()
        if expiration_time and current_time >= expiration_time:
            return None

        # Link exists and is valid; return its long URL
        return result['long_url']

    def get_visits(self, short_url: str):
        """Returns all visit information to the given short URL.

        :param short_url: A shortened URL

        :returns:
          - A JSON-compatible Python dict containing the database response.
        """

        query = {'link_id': self.get_url_id(short_url)}
        return SearchResults(self.db.visits.find(query), self.db.visits.count_documents(query))

    def get_num_visits(self, short_url: str) -> int:
        """Given a short URL, return the number of visits.

        :param short_url: A shortened URL

        :returns:
          A nonnegative integer indicating the number of times the URL has been
          visited, or None if the URL does not exist in the database.
        """

        document = self.db.urls.find_one({'short_url': short_url})
        return document['visits'] if document else None

    def visit(self, short_url: str, tracking_id: Optional[str],
              source_ip: str, user_agent: Optional[str], referer: Optional[str]) -> None:
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

        resp = self.db.urls.find_one({'short_url': short_url})
        if not self.db.visits.find_one({'link_id': resp['_id'], 'tracking_id': tracking_id}):
            self.db.urls.update_one({'short_url': short_url},
                                    {'$inc': {'visits': 1, 'unique_visits': 1}})
        else:
            self.db.urls.update_one({'short_url': short_url}, {'$inc': {'visits': 1}})

        state_code, country_code = self.get_location_codes(source_ip)
        self.db.visits.insert_one({
            'link_id': resp['_id'],
            'tracking_id': tracking_id,
            'source_ip': source_ip,
            'time': datetime.datetime.now(),
            'user_agent': user_agent,
            'referer': referer,
            'state_code': state_code,
            'country_code': country_code
        })

    def is_blocked(self, long_url: str) -> bool:
        """Check whether a url is blocked in the database.

        :param long_url: The long url to query
        """

        return bool(self.db.grants.find_one({
            'role': 'blocked_url',
            'entity': {'$regex': '%s*' % get_domain(long_url)}
        }))

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

    def may_view_url(self, url: str, netid: str) -> bool:
        """Check whether the specified user may view the specified url.

        :param url: The url
        :param netid: The user's NetID
        """

        if self.check_role('admin', netid):
            return True

        def match_netid(netid):
            return [{'$match': {'members.netid': netid}}, {'$project': {'_id': 0, 'name': 1}}]

        info = self.get_url_info(url)
        if not info:
            return False
        owner_netid = info['netid']

        if netid == owner_netid:
            return True

        aggregation = [
            {'$facet': {
                'owner_orgs': match_netid(owner_netid),
                'viewer_orgs': match_netid(netid)
            }},
            {'$project': {'intersection': {'$setIntersection': ['$owner_orgs', '$viewer_orgs']}}},
            {'$project': {'owner_orgs': 0, 'viewer_orgs': 0}}
        ]

        result = next(self.db.organizations.aggregate(aggregation))
        return len(result['intersection']) != 0 if result else False

    def record_visit(self, netid: str, endpoint: str):
        return self.db.endpoint_statistics.find_one_and_update(
            {'endpoint': endpoint, 'netid': netid},
            {'$set': {'endpoint': endpoint, 'netid': netid},
             '$inc': {'count': 1}},
            upsert=True)

    def blacklist_user_links(self, netid: str) -> UpdateResult:
        return self.db.urls.update_many({'netid': netid,
                                         'deleted': {'$ne': True}},
                                        {'$set': {'deleted': True,
                                                  'deleted_by': '!BLACKLISTED',
                                                  'deleted_time': datetime.datetime.now()}})

    def unblacklist_user_links(self, netid: str) -> UpdateResult:
        return self.db.urls.update_many({'netid': netid,
                                         'deleted': True,
                                         'deleted_by': '!BLACKLISTED'},
                                        {'$set': {'deleted': False},
                                         '$unset': {
                                             'deleted_by': 1,
                                             'deleted_time': 1
                                        }})

    def block_urls(self, ids) -> UpdateResult:
        return self.db.urls.update_many({'_id': {'$in': list(ids)},
                                         'deleted': {'$ne': True}},
                                        {'$set': {'deleted': True,
                                                  'deleted_by': '!BLOCKED',
                                                  'deleted_time': datetime.datetime.now()}})

    def unblock_urls(self, ids) -> UpdateResult:
        return self.db.urls.update_many({'_id': {'$in': list(ids)},
                                         'deleted': True,
                                         'deleted_by': '!BLOCKED'},
                                        {'$set': {'deleted': False},
                                         '$unset': {
                                             'deleted_by': 1,
                                             'deleted_time': 1
                                        }})

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
