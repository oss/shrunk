# shrunk - Rutgers University URL Shortener

"""Database-level interactions for shrunk. """
import datetime
import random
import string
import time

import pymongo

EXECUTABLE_MONGO_METHODS = set([typ for typ in dir(pymongo.collection.Collection) if not typ.startswith('_')])
EXECUTABLE_MONGO_METHODS.update(set([typ for typ in dir(pymongo) if not typ.startswith('_')]))
"""Define which MongoDB methods should be wrapped by the MongoProxy class.
Wrap all methods in pymongo, pymongo.Connection and pymongo.collection.Collection that don't start with '_'."""


def safe_mongocall(call):
    """Decorator to safely handle MongoDB calls"""
    def _safe_mongocall(*args, **kwargs):
        for x in range(5): # Try to execute instruction 5 times
            try:
                return call(*args, **kwargs)
            except (pymongo.errors.ConnectionFailure, pymongo.errors.AutoReconnect) as e:
                # Should I log args and kwargs??
                print(str(e))
                time.sleep(x*(1+5**0.5)/2) # Scaling golden ratio
        # Log error: Could not connect to MongoDB
    return _safe_mongocall


class DuplicateIdException(Exception):
    """Raised when trying to add a duplicate key to the database."""
    pass


class ForbiddenNameException(Exception):
    """Raised when trying to use a forbidden custom short URL."""
    pass


class InvalidOperationException(Exception):
    """Raised when performing an invalid operation."""
    pass


class ConnectionFailureException(Exception):
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


class ShrunkExecutable:
    """A class to encapsulate MongoDB methods and handle AutoReconnect
    exceptions transparently with a predefined decorator.
    """
    def __init__(self, method):
        """Initializes self with a given method

        :Parameters:
          - `method`: function to attribute to this ShrunkExecutable instance
        """
        self.method = method

    @safe_mongocall
    def __call__(self, *args, **kwargs):
        """Executes the function with the safe_mongocall decorator.

        Overrides the default __call__ which is called when an instance of
        the class is called.
        """
        return self.method(*args, **kwargs)


class MongoProxy:
    """Proxy for MongoDB connection.
    Methods that are executable, like find and insert, are wrapped up into
    the ShrunkExecutable class which handles AutoReconnect-exceptions transparently.
    """

    def __init__(self, conn=None):
        """Initializes self with a given MongoDB connection.

        :Parameters:
          - `conn`: ordinary MongoDB-connection.
        """
        self.conn = conn

    def __getitem__(self, key):
        """Create and return proxy around the method in the connection named "key"
        """
        return MongoProxy(getattr(self.conn, key)) if self.conn is not None else None

    def __getattr__(self, key):
        """If key is the name of an executable method in the MongoDB connection,
        like find or insert, wrap this method in the ShrunkExecutable class.
        Else call __getitem__(key)
        """
        if self.conn is None:
            return None
        if key in EXECUTABLE_MONGO_METHODS:
            return ShrunkExecutable(getattr(self.conn, key))
        return self[key]

    def __call__(self, *args, **kwargs):
        if self.conn is None:
            return None
        return self.conn(*args, **kwargs)

    def __dir__(self):
        if self.conn is None:
            return None
        return dir(self.conn)

    def __repr__(self):
        if self.conn is None:
            return None
        return self.conn.__repr__()


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

    RESERVED_WORDS = ["add", "login", "logout", "delete", "admin"]
    """Reserved words that cannot be used as shortened urls."""

    def __init__(self, host=None, port=None):
        """Create a new client connection.

        This client uses MongoDB. No network traffic occurs until a data method
        is called.

        :Parameters:
          - `host` (optional): the hostname to connect to; defaults to
            "localhost"
          - `port` (optional): the port to connect to on the server; defaults to
            the database default if not present
        """

        for x in range(3):
            try:
                self._mongo = MongoProxy(pymongo.MongoClient(host, port))
                self.conn = "on"
                return
            except (pymongo.errors.ConnectionFailure, pymongo.errors.AutoReconnect):
                time.sleep(x*(1+5**0.5)/2) # Scaling golden ratio

        self._mongo = MongoProxy() # Log something
        self.conn = "off"


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

    @safe_mongocall
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

        # Check if url is blocked
        base_url = long_url[(long_url.find("://") + 3):] # Strip any protocol
        base_url = base_url[: base_url.find("/")] # Strip path
        if db.blocked_urls.find_one({"url" : { "$regex" : "%s*" % base_url }}):
            raise ForbiddenNameException("That URL is not allowed.")

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

    def modify_url(self, old_short_url, admin, short_url=None, **kwargs):
        """Modifies an existing URL.

        Edits the values of the url `short_url` and replaces them with the
        values specified in the keyword arguments.

        :Parameters:
          - `short_url`: The ID of the URL to edit.
          - `kwargs`: A dictionary of keyword arguments. The URL will take on
            all values specified.
        """
        db = self._mongo.shrunk_urls
        document = db.urls.find_one({"_id": old_short_url})

        if not admin:
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
                            {"$set" : kwargs})
            else:
                response = db.urls.update({"_id" : old_short_url},
                                          {"$set" : kwargs})
        else:
            response = db.urls.update({"_id" : old_short_url},
                           {"$set" : kwargs})

        return response

    def delete_url(self, short_url):
        """Given a short URL, delete it from the database.

        This deletes all information associated with the short URL and wipes all
        appropriate databases.

        :Parameters:
          - `short_url`: The shortened URL to dete.

        :Returns:
          A response in JSON detailing the effect of the database operations.
        """
        url_db = self._mongo.shrunk_urls
        visit_db = self._mongo.shrunk_visits
        if short_url is None:
            return {
                "urlDataResponse" : {"nRemoved" : 0},
                "visitDataResponse" : {"nRemoved" : 0}
            }
        else:
            return {
                "urlDataResponse" : url_db.urls.remove({
                    "_id" : short_url
                }),
                "visitDataResponse" : visit_db.visits.remove({
                    "short_url" : short_url
                })
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
        return ShrunkCursor(db.visits.find({"short_url" : short_url}))

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

    def visit(self, short_url, source_ip, platform, browser, referrer):
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
        db.urls.update({"_id" : short_url},
                       {"$inc" : {"visits" : 1}})

        db = self._mongo.shrunk_visits
        db.visits.insert({
            "short_url" : short_url,
            "source_ip" : source_ip,
            "platform" : platform,
            "referrer" : referrer,
            "browser" : browser,
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

    def is_blocked(self, url):
        """Determines if a URL has been banned.

        :Parameters:
          - `url`: The url to check

        :Returns:
          True if the url is in the blocked_urls collection; False otherwise.
        """
        db = self._mongo.shrunk_urls
        if db.blocked_urls.find_one({'url' : url}) is None:
            return False
        return True

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
            res = db.blocked_urls.insert({'url' : url, 'blocked_by' : blocked_by})
            # Find any urls that should be deleted
            db.urls.remove({"long_url" : { "$regex" : url }})
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
