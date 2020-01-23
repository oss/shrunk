# shrunk - Rutgers University URL Shortener

"""Database-level interactions for shrunk. """
import datetime
import random
import string

import flask
import pymongo
from pymongo.collection import ReturnDocument

from .. import roles
from .. import aggregations
from ..util.string import get_domain

from .exceptions import BadShortURLException, DuplicateIdException, \
    ForbiddenNameException, ForbiddenDomainException, AuthenticationException, \
    NoSuchLinkException
from .search import SortOrder, Pagination, SearchResults, SearchClient  # noqa: F401
from .geoip import GeoipClient
from .orgs import OrgsClient


class ShrunkClient(SearchClient, GeoipClient, OrgsClient):
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

    def __init__(self, *, DB_HOST=None, DB_PORT=27017, DB_USERNAME=None, DB_PASSWORD=None,
                 DB_REPLSET=None, DB_NAME='shrunk', GEOLITE_PATH=None, TESTING=False, **config):
        """Create a new client connection.

        This client uses MongoDB.

        :Parameters:
          - `DB_HOST` (optional): the hostname to connect to; defaults to "localhost"
          - `DB_PORT` (optional): the port to connect to on the server; defaults to 27017
          - `GEOLITE_PATH` (optional): path to geolite ip database
          - `DB_USERNAME` (OPTIONAL): username to login to database
          - `DB_PASSWORD` (OPTIONAL): password to login to database
          - `test_client` (optional): a mock client to use for testing
            the database default if not present
        """

        self._DB_NAME = DB_NAME
        self._TESTING = TESTING
        self._DB_CONNECTION_STRING = None
        self._DB_USERNAME = DB_USERNAME
        self._DB_PASSWORD = DB_PASSWORD
        self._DB_HOST = DB_HOST
        self._DB_PORT = DB_PORT
        self._DB_REPLSET = DB_REPLSET
        self.reconnect()

        self._create_indexes()
        self._set_geoip(GEOLITE_PATH)

    def _create_indexes(self):
        self.db.urls.create_index([('short_url', pymongo.ASCENDING)], unique=True)
        self.db.urls.create_index([('netid', pymongo.ASCENDING)])
        self.db.visits.create_index([('link_id', pymongo.ASCENDING)])
        self.db.visits.create_index([('source_ip', pymongo.ASCENDING)])
        self.db.visitors.create_index([('ip', pymongo.ASCENDING)], unique=True)
        self.db.organizations.create_index([('name', pymongo.ASCENDING)], unique=True)
        self.db.organizations.create_index([('members.name', pymongo.ASCENDING),
                                            ('members.netid', pymongo.ASCENDING)])

    def user_exists(self, netid):
        return self.db.urls.count_documents({'netid': netid}) > 0

    def url_is_reserved(self, url):
        if url in flask.current_app.config.get('RESERVED_WORDS', []):
            return True
        for route in flask.current_app.url_map.iter_rules():
            if url in str(route):
                return True
        return False

    def drop_database(self):
        if self._TESTING:
            self._mongo.drop_database(self._DB_NAME)

    def reset_database(self):
        if self._TESTING:
            for col in ['grants', 'organizations',
                        'urls', 'visitors', 'visits']:
                self.db[col].delete_many({})

    def reconnect(self):
        """
        mongoclient is not fork safe. this is used to create a new client
        after potentially forking
        """
        self._mongo = pymongo.MongoClient(self._DB_HOST, self._DB_PORT,
                                          username=self._DB_USERNAME,
                                          password=self._DB_PASSWORD,
                                          authSource="admin", connect=False,
                                          replicaSet=self._DB_REPLSET)
        self.db = self._mongo[self._DB_NAME]

    def count_links(self, netid=None):
        """Counts the number of created links.

        Gives a count on the number of created links for the given NetID. If no
        specific user is specified, this returns a global count for all users.

        :Parameters:
          - `netid` (optional): Specify a NetID to count their links; if None,
            finds a global count

        :Returns:
          A nonnegative integer.
        """
        if netid:
            return self.db.urls.count_documents({"netid": netid})
        else:
            return self.db.urls.count_documents({})

    def get_url_id(self, short_url):
        """ Get the ObjectId associated with the short url. """
        resp = self.db.urls.find_one({'short_url': short_url})
        return resp['_id'] if resp else None

    def create_short_url(self, long_url, short_url=None, netid=None, title=None):
        """Given a long URL, create a new short URL.

        Randomly creates a new short URL and updates the Shrunk database.

        :Parameters:
          - `long_url`: The original URL to shrink.
          - `short_url` (optional): A custom name for the short URL. A random
            one is generated if none is specified.
          - `netid` (optional): The creator of this URL.
          - `title` (optional): A descriptive title for this URL.

        :Returns:
          The shortened URL.

        :Raises:
          - ForbiddenNameException: if the requested name is a reserved word or
            has been banned by an administrator
          - DuplicateIdException: if the requested name is already taken
        """
        if self.is_blocked(long_url):
            raise ForbiddenDomainException("That URL is not allowed.")

        document = {
            "short_url": short_url,
            "long_url": long_url,
            "timeCreated": datetime.datetime.now(),
            "visits": 0
        }
        if netid is not None:
            document["netid"] = netid
        if title is not None:
            document["title"] = title

        if short_url:
            # Attempt to insert the custom URL
            if self.url_is_reserved(short_url):
                raise ForbiddenNameException("That name is reserved.")

            try:
                response = self.db.urls.insert_one(document)
            except pymongo.errors.DuplicateKeyError:
                raise DuplicateIdException("That name already exists.")
        else:
            # Generate a unique key and update MongoDB
            response = None
            while response is None:
                try:
                    url = ShrunkClient._generate_unique_key()
                    while self.url_is_reserved(url):
                        url = ShrunkClient._generate_unique_key()

                    document["short_url"] = url
                    response = self.db.urls.insert_one(document)
                except pymongo.errors.DuplicateKeyError:
                    continue

        return document['short_url']

    def modify_url(self, *, title=None, long_url=None, short_url=None, old_short_url):
        """Modifies an existing URL.

        Edits the values of the url `short_url` and replaces them with the
        values specified in the keyword arguments.

        :Parameters:
          - `title`: The new title
          - `long_url`: The new long url
          - `short_url`: The new short url (may be same as old_short_url)
          - `old_short_url`: The old short url
        """

        if self.is_blocked(long_url):
            raise ForbiddenDomainException('That URL is not allowed.')

        if short_url is not None and self.url_is_reserved(short_url):
            raise ForbiddenNameException('That name is reserved.')

        new_doc = {}
        if title is not None:
            new_doc['title'] = title
        if long_url is not None:
            new_doc['long_url'] = long_url
        if short_url is not None:
            new_doc['short_url'] = short_url

        try:
            return self.db.urls.update_one({'short_url': old_short_url}, {'$set': new_doc})
        except pymongo.errors.DuplicateKeyError:
            raise BadShortURLException('That name already exists.')

    def is_owner_or_admin(self, short_url, request_netid):
        """ Returns True if request_netid is an admin, or if short_url exists and
            request_netid is the owner of short_url. """
        if roles.check('admin', request_netid):
            return True
        info = self.get_url_info(short_url)
        return info and info['netid'] == request_netid

    def delete_url(self, short_url, request_netid):
        """Given a short URL, delete it from the database.

        This deletes all information associated with the short URL and wipes all
        appropriate databases.

        :Parameters:
          - `short_url`: The shortened URL to dete.
          - `request_netid`: The netid of the user requesting to delete a link

        :Returns:
          A response in JSON detailing the effect of the database operations.
        :Throws:
          AuthenticationException if the user cant edit
          NoSuchLinkException if url doesn't exist
        """
        if not self.is_owner_or_admin(short_url, request_netid):
            raise AuthenticationException()

        link_id = self.get_url_id(short_url)
        if link_id is None:
            raise NoSuchLinkException()

        return {
            "urlDataResponse": {
                "nRemoved": self.db.urls.delete_one({"short_url": short_url}).deleted_count
            },
            "visitDataResponse": {
                "nRemoved": self.db.visits.delete_many({"link_id": link_id}).deleted_count
            }
        }

    def get_url_info(self, short_url):
        """Given a short URL, return information about it.

        This returns a dictionary containing the following fields:
          - long_url : The original unshrunk URL
          - timeCreated: The time the URL was created, expressed as an ISODate
            instance
          - netid : If it exists, the creator of the shortened URL
          - visits : The number of visits to this URL

        :Parameters:
          - `short_url`: A shortened URL
        """
        return self.db.urls.find_one({"short_url": short_url})

    def get_daily_visits(self, short_url):
        """Given a short URL, return how many visits and new unique visiters it gets per month.

        :Parameters:
          - `short_url`: A shortened URL

        :Returns:
         An array, each of whose elements is a dict containing the data for one month.
         The fields of each dict are:
          - `_id`: a dict with keys for month and year.
          - `first_time_visits`: new visits by users who haven't seen the link yet.
          - `all_visits`: the total visits per that month.
        """
        link_id = self.get_url_id(short_url)
        aggregation = [aggregations.match_link_id(link_id)] + \
            aggregations.daily_visits_aggregation
        return list(self.db.visits.aggregate(aggregation))

    def get_admin_stats(self):
        """Get some basic stats about shunk overall
        :Returns:
         A dictionary with the folowing info
          - `visits`: total amount of redirects shrunk has preformed
          - `users`: the amount of users creating links
          - `links`: the amount of links in shrunk
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

    def get_endpoint_stats(self):
        """ Returns a summary of the information in the endpoint_statistics collection.
        :Returns:
          A list of dictionaries with the following fields:
           - `endpoint`: the endpoint name
           - `total_visits`: the total number of visits to the endpoint
           - `unique visits`: the number of unique visits (by netid) to the endpoint
        """

        res = self.db.endpoint_statistics.aggregate([
            {'$group': {
                '_id': {'endpoint': '$endpoint'},
                'total_visits': {'$sum': '$count'},
                'unique_visits': {'$sum': 1}}},
            {'$addFields': {'endpoint': '$_id.endpoint'}},
            {'$project': {'_id': 0}},
            {'$match': {'endpoint': {'$not': {'$eq': 'redirect_link'}}}},
            {'$match': {'endpoint': {'$not': {'$eq': 'static'}}}},
            {'$match': {'endpoint': {'$not': {'$eq': 'shrunk.render_index'}}}},
            {'$match': {'endpoint': {'$not': {'$eq': 'shrunk.render_login'}}}}
            ])
        return list(res)

    def get_long_url(self, short_url):
        """Given a short URL, returns the long URL.

        Performs a case-insensitive search for the corresponding long URL.

        :Parameters:
          - `short_url`: A shortened URL

        :Returns:
          The long URL, or None if the short URL does not exist.
        """
        result = self.get_url_info(short_url)
        return result['long_url'] if result is not None else None

    def get_visits(self, short_url):
        """Returns all visit information to the given short URL.

        :Parameters:
          - `short_url`: A shortened URL

        :Response:
          - A JSON-compatible Python dict containing the database response.
        """
        query = {'link_id': self.get_url_id(short_url)}
        return SearchResults(self.db.visits.find(query), self.db.visits.count_documents(query))

    def get_num_visits(self, short_url):
        """Given a short URL, return the number of visits.

        :Parameters:
          - `short_url`: A shortened URL

        :Returns:
          A nonnegative integer indicating the number of times the URL has been
          visited, or None if the URL does not exist in the database.
        """
        document = self.db.urls.find_one({"short_url": short_url})
        return document["visits"] if document else None

    def visit(self, short_url, source_ip, user_agent, referer):
        """Visits the given URL and logs visit information.

        On visiting a URL, this is guaranteed to perform at least the following
        side effects if the URL is valid:

          - Increment the hit counter
          - Log the visitor

        If the URL is invalid, no side effects will occur.

        :Returns:
          The long URL corresponding to the short URL, or None if no such URL
          was found in the database.
        """
        resp = self.db.urls.find_one({'short_url': short_url})
        if not self.db.visits.find_one({'link_id': resp['_id'], 'source_ip': source_ip}):
            self.db.urls.update_one({'short_url': short_url},
                                    {'$inc': {'visits': 1, 'unique_visits': 1}})
            pass
        else:
            self.db.urls.update_one({'short_url': short_url}, {'$inc': {'visits': 1}})

        state_code, country_code = self.get_location_codes(source_ip)
        self.db.visits.insert_one({
            'link_id': resp['_id'],
            'source_ip': source_ip,
            'time': datetime.datetime.now(),
            'user_agent': user_agent,
            'referer': referer,
            'state_code': state_code,
            'country_code': country_code
        })

    def is_blocked(self, long_url):
        """checks if a url is blocked"""
        return bool(roles.grants.find_one({
            "role": "blocked_url",
            "entity": {"$regex": "%s*" % get_domain(long_url)}
        }))

    def get_visitor_id(self, ipaddr):
        """Gets a unique, opaque identifier for an IP address.

           :Parameters:
             - `ipaddr`: a string containing an IPv4 address.

           :Returns:
             A hexadecimal string which uniquely identifies the given IP address.
        """
        rec = {'ip': str(ipaddr)}
        res = self.db.visitors.find_one_and_update(rec, {'$setOnInsert': {'ip': str(ipaddr)}},
                                                   upsert=True,
                                                   return_document=ReturnDocument.AFTER)
        return str(res['_id'])

    def may_view_url(self, url, netid):
        if roles.check('admin', netid):
            return True

        def match_netid(netid):
            return [{'$match': {'netid': netid}}, {'$project': {'_id': 0, 'name': 1}}]

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

    def record_visit(self, netid, endpoint):
        self.db.endpoint_statistics.find_one_and_update(
            {'endpoint': endpoint, 'netid': netid},
            {'$set': {'endpoint': endpoint, 'netid': netid},
             '$inc': {'count': 1}},
            upsert=True)

    @staticmethod
    def _generate_unique_key():
        """Generates a unique key."""
        return ShrunkClient._base_encode(random.randint(ShrunkClient.URL_MIN,
                                                        ShrunkClient.URL_MAX))

    @staticmethod
    def _base_encode(integer):
        """Encodes an integer into our arbitrary link alphabet.

        Given an integer, convert it to base-36. Letters are case-insensitive;
        this function uses uppercase arbitrarily.

        :Parameters:
          - `integer`: An integer.

        :Returns:
          A string composed of characters from ShrunkClient.ALPHABET.
          """
        length = len(ShrunkClient.ALPHABET)
        result = []
        while integer != 0:
            result.append(ShrunkClient.ALPHABET[integer % length])
            integer //= length

        return "".join(reversed(result))
