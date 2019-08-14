# shrunk - Rutgers University URL Shortener

"""Database-level interactions for shrunk. """
import datetime
import random
import string
import math
import enum

import pymongo
from pymongo.collection import ReturnDocument
from pymongo.collation import Collation
import geoip2.errors
import geoip2.database

from . import roles
from . import aggregations
from .util.string import get_domain


class BadShortURLException(Exception):
    """Raised when the there is an error with the requested short url"""


class DuplicateIdException(BadShortURLException):
    """Raised when trying to add a duplicate key to the database."""


class ForbiddenNameException(BadShortURLException):
    """Raised when trying to use a forbidden custom short URL."""


class ForbiddenDomainException(Exception):
    """Raised when trying to make a link to a forbidden domain"""


class InvalidOperationException(Exception):
    """Raised when performing an invalid operation."""


class AuthenticationException(Exception):
    """User is not authorized to do that"""


class NoSuchLinkException(Exception):
    """link was not found"""


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


class ShrunkClient:
    """A class for database interactions."""

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

    # TODO can we automatically get a list of endpoints from Flask?
    RESERVED_WORDS = ["add", "login", "logout", "delete", "admin", "stats", "qr",
                      "shrunk-login", "roles", "dev-user-login", "dev-admin-login",
                      "dev-facstaff-login", "dev-power-login", "unauthorized", "link-visits-csv",
                      "search-visits-csv", "useragent-stats", "referer-stats",
                      "monthly-visits", "daily-visits", "edit", "geoip-json", "faq"
                      "organizations", "create_organization", "delete_organization",
                      "add_organization_member", "remove_organization_member",
                      "manage_organization"]
    """Reserved words that cannot be used as shortened urls."""

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
        self.db.visits.create_index([('link_id', pymongo.ASCENDING)])
        self.db.visitors.create_index([('ip', pymongo.ASCENDING)], unique=True)
        self.db.organizations.create_index([('name', pymongo.ASCENDING)], unique=True)
        self.db.organization_members.create_index([('name', pymongo.ASCENDING),
                                                   ('netid', pymongo.ASCENDING)],
                                                  unique=True)

    def drop_database(self):
        if self._TESTING:
            self._mongo.drop_database(self._DB_NAME)

    def reset_database(self):
        if self._TESTING:
            for col in ['grants', 'organization_members', 'organizations',
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

    def _set_geoip(self, GEOLITE_PATH):
        self._geoip = geoip2.database.Reader(GEOLITE_PATH)

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
            if short_url in ShrunkClient.RESERVED_WORDS:
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
                    while url in ShrunkClient.RESERVED_WORDS:
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

        if short_url in ShrunkClient.RESERVED_WORDS:
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

    def search(self, *, query=None, netid=None, org=None, sort=None, pagination=None):
        pipeline = []

        if netid is not None:
            pipeline.append({'$match': {'netid': netid}})

        # if an org filter exists, we run the aggregation on the organization_members
        # collection instead of the urls collection. But the output of this stage
        # is just a bunch of URL documents, so the downstream stages don't know the
        # difference.
        if org is not None:
            pipeline.append({'$match': {'name': org}})
            pipeline.append({
                '$lookup': {
                    'from': 'urls',
                    'localField': 'netid',
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
            cur = next(self.db.organization_members.aggregate(pipeline, collation=Collation('en')))
        else:
            cur = next(self.db.urls.aggregate(pipeline, collation=Collation('en')))

        result = cur['result']
        count = cur['count'][0]['count'] if cur['count'] else 0
        return SearchResults(result, count)

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
        self.db.urls.update_one({'short_url': short_url}, {'$inc': {'visits': 1}})
        resp = self.db.urls.find_one({'short_url': short_url})

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

    def get_geoip_location(self, ipaddr):
        """Gets a human-readable UTF-8 string describing the location of the given IP address.

           :Parameters:
             - `ipaddr`: a string containing an IPv4 address.

           :Returns:
             A string describing the geographic location location of the IP address,
             or the string ``"unknown"`` if the location of the IP address cannot
             be determined.
        """

        unk = 'unknown'

        if ipaddr.startswith('172.31'):  # RUWireless (NB)
            return 'Rutgers New Brunswick, New Jersey, United States'
        elif ipaddr.startswith('172.27'):  # RUWireless (NWK)
            return 'Rutgers Newark, New Jersey, United States'
        # elif ipaddr.startswith('172.19'):  # CCF, but which campus?
        elif ipaddr.startswith('172.24'):  # "Camden Computing Services"
            return 'Rutgers Camden, New Jersey, United States'
        elif ipaddr.startswith('172.'):
            return 'New Jersey, United States'

        try:
            resp = self._geoip.city(ipaddr)

            # some of city,state,country may be None; those will be filtered out below
            city = resp.city.name
            state = None
            try:
                state = resp.subdivisions.most_specific.name
            except AttributeError:
                pass
            country = resp.country.name

            components = [x for x in [city, state, country] if x]

            if not components:
                return unk

            return ', '.join(components)
        except geoip2.errors.AddressNotFoundError:
            return unk

    def get_geoip_json(self, url):
        def not_null(field):
            return [{'$match': {field: {'$exists': True, '$ne': None}}}]

        def group_by(op):
            return [{'$group': {'_id': op, 'value': {'$sum': 1}}}]

        resp = self.db.urls.find_one({'short_url': url})
        filter_us = [{'$match': {'country_code': 'US'}}]

        rename_id = [
            {'$addFields': {'code': '$_id'}},
            {'$project': {'_id': 0}}
        ]

        aggregation = [
            {'$match': {'link_id': resp['_id']}},
            {'$facet': {
                'us': filter_us + not_null('state_code') + group_by('$state_code') + rename_id,
                'world': not_null('country_code') + group_by('$country_code') + rename_id
            }}
        ]

        return next(self.db.visits.aggregate(aggregation))

    def get_location_codes(self, ipaddr):
        if ipaddr.startswith('172.'):
            return 'NJ', 'US'
        try:
            resp = self._geoip.city(ipaddr)
            country = resp.country.iso_code
            try:
                state = resp.subdivisions.most_specific.iso_code if country == 'US' else None
            except AttributeError:
                state = None
            return state, country
        except (AttributeError, geoip2.errors.AddressNotFoundError):
            return None, None

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

        result = next(self.db.organization_members.aggregate(aggregation))
        return len(result['intersection']) != 0 if result else False

    def create_organization(self, name):
        col = self.db.organizations
        rec_query = {'name': name}
        rec_insert = {'name': name, 'timeCreated': datetime.datetime.now()}
        res = col.find_one_and_update(rec_query, {'$setOnInsert': rec_insert}, upsert=True,
                                      return_document=ReturnDocument.BEFORE)
        # return false if organization already existed, otherwise true
        return res is None

    def delete_organization(self, name):
        with self._mongo.start_session() as s:
            s.start_transaction()
            self.db.organization_members.delete_many({'name': name})
            self.db.organizations.delete_one({'name': name})
            s.commit_transaction()

    def get_organization_info(self, name):
        col = self.db.organizations
        return col.find_one({'name': name})

    def is_organization_member(self, name, netid):
        col = self.db.organization_members
        res = col.find_one({'name': name, 'netid': netid})
        return bool(res)

    def is_organization_admin(self, name, netid):
        col = self.db.organization_members
        res = col.find_one({'name': name, 'netid': netid})
        return res['is_admin'] if res else False

    def add_organization_member(self, name, netid, is_admin=False):
        col = self.db.organization_members
        rec = {'name': name, 'netid': netid}
        rec_insert = {'name': name,
                      'is_admin': is_admin,
                      'netid': netid,
                      'timeCreated': datetime.datetime.now()}
        res = col.find_one_and_update(rec, {'$setOnInsert': rec_insert},
                                      upsert=True, return_document=ReturnDocument.BEFORE)
        return res is None

    def add_organization_admin(self, name, netid):
        self.add_organization_member(name, netid, is_admin=True)
        return True

    def remove_organization_member(self, name, netid):
        col = self.db.organization_members
        col.delete_one({'name': name, 'netid': netid})

    def remove_organization_admin(self, name, netid):
        col = self.db.organization_members
        col.update_one({'name': name, 'netid': netid}, {'$set': {'is_admin': False}})

    def count_organization_members(self, name):
        col = self.db.organization_members
        return col.count_documents({'name': name})

    def get_organization_members(self, name):
        col = self.db.organization_members
        return col.find({'name': name})

    def count_organization_admins(self, name):
        col = self.db.organization_members
        return col.count_documents({'name': name, 'is_admin': True})

    def get_organization_admins(self, name):
        col = self.db.organization_members
        return col.find({'name': name, 'is_admin': True})

    def get_member_organizations(self, netid):
        col = self.db.organization_members
        return col.find({'netid': netid})

    def get_admin_organizations(self, netid):
        col = self.db.organization_members
        return col.find({'netid': netid, 'is_admin': True})

    def may_manage_organization(self, name, netid):
        if not self.get_organization_info(name):
            return False
        if roles.check('admin', netid):
            return 'site-admin'
        if self.is_organization_admin(name, netid):
            return 'admin'
        if self.is_organization_member(name, netid):
            return 'member'
        return False

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
