# shrunk - Rutgers University URL Shortener

"""Database-level interactions for shrunk. """
import datetime
import random
import string
import re
import pymongo
from shrunk.aggregations import match_short_url, monthly_visits_aggregation

class BadShortURLException(Exception):
    """Raised when the there is an error with the requested short url"""

class DuplicateIdException(BadShortURLException):
    """Raised when trying to add a duplicate key to the database."""
    pass

class ForbiddenNameException(BadShortURLException):
    """Raised when trying to use a forbidden custom short URL."""
    pass

class ForbiddenDomainException(Exception):
    """Raised when trying to make a link to a forbidden domain"""


class InvalidOperationException(Exception):
    """Raised when performing an invalid operation."""
    pass


class ShrunkCursor(object):
    """Easy-to-use wrapper for internal database cursors."""
    TIME_DESC = 0
    """Sort by creation time, descending."""

    TIME_ASC = 1
    """Sort by creation time, ascending."""


    TITLE_ASC = 2
    """Sort by title, alphabetically."""

    TITLE_DESC = 3
    """Sort by title, reverse-alphabetically."""

    def __init__(self, cursor):
        """Represents the result of a database operation.

        :Parameters:
          - `cursor`: A MongoDB cursor
        """
        self.cursor = cursor

    def paginate(self, page, links_per_page):
        """Performs pagination on this cursor.

        This pagination assumes that pages are one-indexed; that is, the first
        page starts numbering as page 1. Specifying a page number of zero or
        less gives the first page; specifying a page number after the last gives
        the last page.

        :Parameters:
          - `page`: An integer. Only show the results that belong on this page
          - `links_per_page`: Limit the number of results for each page

        :Side Effects:
          Calling `get_results` on this cursor will return only the results that
          belong on the given page. (All of the other results will be lost.)

        :Returns:
          A tuple containing the current page number and the last page number.
        """
        if self.cursor is None:
            return (1, 1)

        # Calculate the pagination
        count = self.cursor.count()
        last_page = self.get_last_page(links_per_page)
        page = min(max(page, 1), last_page)

        # Apply a skip and limit to the cursor
        self.cursor.skip((page-1)*links_per_page).limit(links_per_page)

        # Return the new page number and total count
        return (page, last_page)

    def get_results(self):
        """Gets the results in the cursor in list form.

        After calling this function, the cursor will be exhausted and no more
        results may be drawn from it.

        :Returns:
          A list of JSON-compatible dictionaries containing the results from the
          database.
        """
        if self.cursor is None:
            return []
        else:
            return list(self.cursor)

    def get_last_page(self, links_per_page):
        """Calculates the total number of pages of results.

        Performs some simple calculation of the total number of pages that will
        be shown for the main application's pagination.

        :Parameters:
          - `links_per_page`: The maximum number of links per page

        :Returns:
          A nonnegative integer indicating the one-based index number of the
          last page. For instance, if `count` is 11 and `links_per_page` is 5,
          then this function returns 3.
        """
        if not self.cursor:
            return 1

        count = self.cursor.count()
        if count < links_per_page:
            return 1
        elif count % links_per_page == 0:
            # Special case: fills all pages exactly
            return count // links_per_page
        else:
            return (count // links_per_page) + 1

    def sort(self, sortby):
        """Sort the results in the cursor.

        The cursor can be sorted only if it hasn't been used yet; that is, no
        records have been read from it.

        Note: MongoDB does not sort in case-insensitive alphabetical order, so
        it sorts by A-Z, then a-z. Address this by filtering list output on
        view controller.

        :Parameters:
          - `sortby`: The direction to sort in. Should be one of TIME_ASC,
            TIME_DESC, TITLE_ASC, or TITLE_DESC

        :Raises:
          - ValueError: if the sorting parameter is invalid
          - InvalidOperationException: if the cursor has already been used
            before sorting
        """
        try:
            sortby = int(sortby)
            if sortby == ShrunkCursor.TIME_ASC:
                self.cursor.sort("timeCreated", pymongo.ASCENDING)
            elif sortby == ShrunkCursor.TIME_DESC:
                self.cursor.sort("timeCreated", pymongo.DESCENDING)
            elif sortby == ShrunkCursor.TITLE_ASC:
                self.cursor.sort([("title", pymongo.ASCENDING),
                                  ("_id", pymongo.ASCENDING)])
            elif sortby == ShrunkCursor.TITLE_DESC:
                self.cursor.sort([("title", pymongo.DESCENDING),
                                  ("_id", pymongo.DESCENDING)])
            else:
                raise IndexError("Invalid argument to 'sortby'")
        except ValueError:
            raise ValueError("'sortby' must be an integer")
        except pymongo.errors.InvalidOperation:
            raise InvalidOperationException(
                    "You cannot sort a cursor after use.")


class ShrunkClient(object):
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

    RESERVED_WORDS = ["add", "login", "logout", "delete", "admin", "stats", "qr"]
    """Reserved words that cannot be used as shortened urls."""

    def __init__(self, host=None, port=None, test_client=None):
        """Create a new client connection.

        This client uses MongoDB. No network traffic occurs until a data method
        is called.

        :Parameters:
          - `host` (optional): the hostname to connect to; defaults to
            "localhost"
          - `port` (optional): the port to connect to on the server; defaults to
          - `test_client` (optional): a mock client to use for testing
            the database default if not present
        """
        if test_client:
            self._mongo = test_client
        else:
            self._mongo = pymongo.MongoClient(host, port)

    def clone_cursor(self, cursor):
        """Clones an already existing ShrunkCursor object.

        :Parameters:
        - `cursor`: An already existing ShrunkCursor object.

        :Returns:
          Another ShrunkCursor object. A clone.
        """
        return ShrunkCursor(cursor.cursor.clone())

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
        db = self._mongo.shrunk_urls
        if netid:
            return db.urls.find({"netid": netid}).count()
        else:
            return db.urls.count()

    def get_domain(self, long_url):
        db = self._mongo.shrunk_urls
        protocol_location = long_url.find("://")
        base_url = long_url[(protocol_location + 3):] # Strip any protocol
        if protocol_location < 0:
            base_url = long_url

        slash = base_url.find("/")
        domain = base_url[: base_url.find("/")] # Strip path
        if slash < 0:
            domain = base_url
        # url can contain a-z a hyphen or 0-9 and is seprated by dots.
        # this regex gets rid of any subdomains
        # memes.facebook.com matches facebook.com
        # 1nfo3-384ldnf.doo544-f8.cme-02k4.tk matches cme-02k4.tk
        match = re.search("([a-z\-0-9]+\.[a-z\-0-9]+)$", domain, re.IGNORECASE)
        #search for domain if we can't match for a top domain
        
        return  match.group().lower() if match else domain
        

    def is_blocked(self, long_url):
        db = self._mongo.shrunk_urls
        return bool(db.blocked_urls.find_one({"url": {"$regex": "%s*" % self.get_domain(long_url)}}))
            

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
        db = self._mongo.shrunk_urls

        if self.is_blocked(long_url):
            raise ForbiddenDomainException("That URL is not allowed.")

        document = {
            "_id" : short_url,
            "long_url" : long_url,
            "timeCreated" : datetime.datetime.now(),
            "visits" : 0
        }
        if netid is not None:
            document["netid"] = netid
        if title is not None:
            document["title"] = title

        if short_url is not None:
            # Attempt to insert the custom URL
            if short_url in ShrunkClient.RESERVED_WORDS:
                raise ForbiddenNameException("That name is reserved.")

            try:
                response = db.urls.insert(document)
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

                    document["_id"] = url
                    response = db.urls.insert(document)
                except pymongo.errors.DuplicateKeyError:
                    continue

        return response

    def modify_url(self, old_short_url=None, admin=False, power_user=False, short_url=None, **new_doc):
        print(old_short_url, admin, power_user, short_url, new_doc)
        """Modifies an existing URL.

        Edits the values of the url `short_url` and replaces them with the
        values specified in the keyword arguments.

        :Parameters:
          - `old_short_url`: The ID of the URL to edit.
          - `admin`: If the requester is an admin
          - `power_user`: If the requester is an power user
          - `short_url`: The new short url (for custom urls)
          - `new_doc`: All the feilds to $set in the document
        """
        db = self._mongo.shrunk_urls

        if self.is_blocked( new_doc["long_url"]):
            raise ForbiddenDomainException("That URL is not allowed.")

        document = db.urls.find_one({"_id": old_short_url})

        if not admin and not power_user:
            short_url=None

        if short_url is not None:
            if short_url in ShrunkClient.RESERVED_WORDS:
                raise ForbiddenNameException("That name is reserved.")
            else:
                document["_id"] = short_url

            if old_short_url != short_url:
                try:
                    response = db.urls.insert(document)
                except pymongo.errors.DuplicateKeyError:
                    raise DuplicateIdException("That name already exists.")
                db.urls.remove({"_id": old_short_url})
                db.urls.update({"_id" : short_url},
                               {"$set" : new_doc})
            else:
                response = db.urls.update({"_id" : old_short_url},
                                          {"$set" : new_doc})
        else:
            response = db.urls.update({"_id" : old_short_url},
                                      {"$set" : new_doc})

        return response

    def is_owner_or_admin(self, short_url, request_netid):
        url_db = self._mongo.shrunk_urls
        url_owner=url_db.urls.find_one({"_id":short_url},projection={"netid"})["netid"]
        requester_is_owner=url_owner==request_netid
        admin=self.is_admin(request_netid)

        return requester_is_owner or admin

    def delete_url(self, short_url, request_netid):
        """Given a short URL, delete it from the database.

        This deletes all information associated with the short URL and wipes all
        appropriate databases.

        :Parameters:
          - `short_url`: The shortened URL to dete.
          - `request_netid`: The netid of the user requesting to delete a link

        :Returns:
          A response in JSON detailing the effect of the database operations.
        """
        url_db = self._mongo.shrunk_urls
        visit_db = self._mongo.shrunk_visits
        
        if short_url is not None and self.is_owner_or_admin(short_url, request_netid):
            return {
                "urlDataResponse" : url_db.urls.delete_one({
                    "_id" : short_url
                }),
                "visitDataResponse" : visit_db.visits.delete_one({
                    "short_url" : short_url
                })
            }
        else:
            return {
                "urlDataResponse" : {"nRemoved" : 0},
                "visitDataResponse" : {"nRemoved" : 0}
            }

    def delete_user_urls(self, netid):
        """Deletes all URLs associated with a given NetID.

        The response, encoded as a JSON-compatible Python dict, will at least
        contained an "nRemoved" indicating the number of records removed.

        :Parameters:
          - `netid`: The NetID of the URLs to delete.

        :Returns:
          A response in JSON detailing the effect of the database operations.
        """
        db = self._mongo.shrunk_urls
        if netid is None:
            return {"nRemoved" : 0}
        else:
            return db.urls.remove({"netid" : netid})

    def get_url_info(self, short_url):
        """Given a short URL, return information about it.

        This returns a dictionary containing the following fields:
          - url : The original unshrunk URL
          - timeCreated: The time the URL was created, expressed as an ISODate
            instance
          - netid : If it exists, the creator of the shortened URL
          - visits : The number of visits to this URL

        :Parameters:
          - `short_url`: A shortened URL
        """
        db = self._mongo.shrunk_urls
        return db.urls.find_one({"_id" : short_url})
    
    def get_monthly_visits(self, short_url):
        """Given a short URL, return how many visits and new unique visiters it gets
        per month
        this returns an array where each element the data for a month
          - _id : a dict with keys for month and year
          - first_time_visits : new visits by users who haven't seen the link yet
          - all_visits : the total visits per that month
        :Parameters:
          - `short_url`: A shortened URL
        
        """
        db = self._mongo.shrunk_visits
        aggregation=[match_short_url(short_url)] + monthly_visits_aggregation
        return db.visits.aggregate(aggregation)
        

    def get_long_url(self, short_url):
        """Given a short URL, returns the long URL.

        Performs a case-insensitive search for the corresponding long URL.

        :Parameters:
          - `short_url`: A shortened URL

        :Returns:
          The long URL, or None if the short URL does not exist.
        """
        result = self.get_url_info(short_url)
        if result is not None:
            return result["long_url"]
        else:
            return None

    def get_visits(self, short_url):
        """Returns all visit information to the given short URL.

        :Parameters:
          - `short_url`: A shortened URL

        :Response:
          - A JSON-compatible Python dict containing the database response.
        """
        db = self._mongo.shrunk_visits
        return db.visits.find({"short_url" : short_url})

    def get_num_visits(self, short_url):
        """Given a short URL, return the number of visits.

        :Parameters:
          - `short_url`: A shortened URL

        :Returns:
          A nonnegative integer indicating the number of times the URL has been
          visited, or None if the URL does not exist in the database.
        """
        db = self._mongo.shrunk_urls
        try:
            # Can be at most one document
            [document] = [doc for doc in db.urls.find({"_id" : short_url})]
            return document["visits"]
        except ValueError:
            # There were no values to unpack
            return None

    def get_all_urls(self, filter_dict=None):
        """Gets all the URLs created.

        :Parameters:
          - `filter_dict` (optional): Mongo filter to be applied to the query
          - `skip` (optional): The number of results to skip
          - `limit` (optional): The maximum number of results

        :Returns:
          A ShrunkCursor containing the results of the operation.
        """
        db = self._mongo.shrunk_urls
        if not filter_dict:
            cursor = db.urls.find(sort=[("timeCreated", pymongo.DESCENDING)])
        else:
            cursor = db.urls.find(filter_dict,
                                  sort=[("timeCreated", pymongo.DESCENDING)])
        return ShrunkCursor(cursor)

    def get_urls(self, netid):
        """Gets all the URLs created by the given NetID.

        :Parameters:
          - `netid`: A Rutgers NetID

        :Returns:
          A ShrunkCursor containing the results of the operation.
        """
        return self.get_all_urls(filter_dict={'netid' : netid})

    def search(self, search_string, netid=None):
        """Search for URLs containing the given search string.

        Searches for links where the title or URL contain the given search
        string. The search is non-case-sensitive.

        :Parameters:
          - `search_string`: A query string
          - `netid` (optional): Search for links only owned by this NetID

        :Returns:
          A Shrunk cursor containing the results of the search, or None if an
          error occurred.
        """
        db = self._mongo.shrunk_urls
        match = {"$regex" : search_string, "$options" : "i"}
        query = {"$or" : [{"long_url" : match}, {"title" : match}, {"netid" : match}]}
        if netid is not None:
            query["netid"] = netid

        cursor = db.urls.find(query)
        return ShrunkCursor(cursor)

    def visit(self, short_url, source_ip):
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
        db = self._mongo.shrunk_urls
        # TODO return type and validation that the URL exists
        db.urls.update({"_id" : short_url},
                       {"$inc" : {"visits" : 1}})

        # TODO Do we need the source ip or can we detect it?
        db = self._mongo.shrunk_visits
        db.visits.insert({
            "short_url" : short_url,
            "source_ip" : source_ip,
            "time" : datetime.datetime.now()
        })

    def is_blacklisted(self, netid):
        """Determines if a user has been blacklisted.

        :Parameters:
          - `netid` A Rutgers NetID

        :Returns
          True if the user is in the blacklist collection; False otherwise.
        """
        db = self._mongo.shrunk_users
        if db.blacklist.find_one({"netid" : netid}) is None:
            return False
        return True

    def ban_user(self, netid, banned_by):
        """Adds a user to the blacklist collection.

        :Parameters:
          - `netid`: A Rutgers NetID
          - `banned_by`: The NetID of the administrator that banned this person
        """
        db = self._mongo.shrunk_users
        if not self.is_blacklisted(netid):
            return db.blacklist.insert({
                'netid' : netid,
                'banned_by' : [ banned_by ]
            })
        else:
            update = {'$addToSet' : {'banned_by' : banned_by}}
            return db.blacklist.update({'netid' : netid}, update, upsert=False,
                    multi=False)

    def unban_user(self, netid):
        """Removes a user from the blacklist collection.

        :Parameters:
          - `netid`: A Rutgers NetID
        """
        db = self._mongo.shrunk_users
        if self.is_blacklisted:
            db.blacklist.remove({'netid' : netid})
            return True
        else:
            return False

    def is_power_user(self, netid):
        """ Determines if user is power user.
            Power users can create vanity URLS, but do not have admin privileges

        :Parameters:
         - `netid`: A Rutgers NetID

        :Returns:
          True if the user is in the power_users collection, False otherwise.
        """

        db = self._mongo.shrunk_users
        if db.power_users.find_one({'netid' : netid}) is None:
            return False
        return True

    def add_power_user(self, netid, added_by):
        """Admins can add users to the power_users collection
        :Parameters:
          - `netid`: A Rutgers NetID
          -`added_by`: The NetID of the administrator that added this person

        """
        print("adding power user") 
        db = self._mongo.shrunk_users
        if not self.is_power_user(netid):
            return db.power_users.insert({"netid" : netid, "added_by" : added_by})

    def get_power_users(self):
        """Retrieves the list of power users.

        :Returns:
          A list of dicts containing information about each power user.
        """
        db = self._mongo.shrunk_users
        return list(db.power_users.find())

    def delete_power_user(self, netid):
        """Revokes a user's power user privileges.

        :Parameters:
          - `netid`: They NetID of the power user to remove
        """
        db = self._mongo.shrunk_users
        return db.power_users.remove({"netid" : netid})

    def is_admin(self, netid):
        """Determine if a user is an administrator.

        :Parameters:
          - `netid`: A Rutgers NetID.

        :Returns:
          True if the user is in the administrators collection, False
          otherwise.
        """
        db = self._mongo.shrunk_users
        if db.administrators.find_one({'netid' : netid}) is None:
            return False
        return True

    def add_admin(self, netid, added_by):
        """Adds a user to the administrators collection.

        :Parameters:
          - `netid`: A Rutgers NetID
          - `added_by`: The NetID of the administrator that added this person
        """
        print("adding admin")
        db = self._mongo.shrunk_users
        if not self.is_admin(netid):
            return db.administrators.insert({"netid" : netid, "added_by" :
                added_by})

    def delete_admin(self, netid):
        """Revokes a user's administrator privileges.

        :Parameters:
          - `netid`: They NetID of the administrator to remove
        """
        db = self._mongo.shrunk_users
        return db.administrators.remove({"netid" : netid})

    def get_admins(self):
        """Retrieves the list of administrators.

        :Returns:
          A list of dicts containing information about each administrator.
        """
        db = self._mongo.shrunk_users
        return list(db.administrators.find())

    def get_blocked_links(self):
        """Retrieves the list of blocked links.

        :Returns:
          A list of dicts containing information about each blocked link.
        """
        db = self._mongo.shrunk_urls
        return list(db.blocked_urls.find())

    def block_link(self, url, blocked_by):
        """Adds a link to the blocked_urls collection.

        :Parameters:
          - `url`: The url to block
          - `blocked_by`: The NetIDs of the administrators blocking the URL
        """
        db = self._mongo.shrunk_urls
        if not self.is_blocked(url):
            res = db.blocked_urls.insert({'url': self.get_domain(url), 'blocked_by': blocked_by})
            # Find any urls that should be deleted
            db.urls.remove({"long_url": {"$regex": "%s*" % self.get_domain(url)}})
            return res

    def allow_link(self, url):
        """Removes a link from the blocked_urls collection.

        :Parameters:
          - `url`: The url to allow
        """
        db = self._mongo.shrunk_urls
        return db.blocked_urls.remove({'url' : { '$regex' : url }})

    def get_blacklisted_users(self):
        """Retrieves the list of banned users.

        :Returns:
          A list of dicts containing information about each blacklisted NetID.
        """
        db = self._mongo.shrunk_users
        return list(db.blacklist.find())

    @staticmethod
    def _generate_unique_key():
        """Generates a unique key."""
        return ShrunkClient._base_encode(
                random.randint(ShrunkClient.URL_MIN, ShrunkClient.URL_MAX))

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
