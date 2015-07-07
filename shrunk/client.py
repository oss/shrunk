""" shrunk - Rutgers University URL Shortener

Implements database-level interactions for the shrunk application.
"""
import datetime
import random
import string

import pymongo


class DuplicateIdException(Exception):
    """Raised when trying to add a duplicate key to the database."""
    pass


class ForbiddenNameException(Exception):
    """Raised when trying to use a forbidden custom short URL."""
    pass


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
            return (0, 0)

        # Calculate the pagination
        count = self.cursor.count()
        last_page = self.get_last_page(links_per_page)
        page = min(max(page, 0), last_page)

        # Apply a skip and limit to the cursor
        self.cursor.skip(page*links_per_page).limit(links_per_page)

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
          A nonnegative integer indicating the zero-based index number of the
          last page. For instance, if `count` is 11 and `links_per_page` is 5,
          then this function returns 2 (since there are three pages total).
        """
        if not self.cursor:
            return 0

        count = self.cursor.count()
        if count < links_per_page:
            return 0
        elif count % links_per_page == 0:
            # Special case: fills all pages exactly
            return (count // links_per_page) - 1
        else:
            return count // links_per_page

    def sort(self, sortby):
        """Sort the results in the cursor.

        The cursor can be sorted only if it hasn't been used yet; that is, no
        records have been read from it.

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
        self._mongo = pymongo.MongoClient(host, port)

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
          - ForbiddenNameException: if the requested name is a reserved word
          - DuplicateIdException: if the requested name is already taken
        """
        custom_url = short_url is not None
        db = self._mongo.shrunk_urls

        #Check if url is blocked
        base_url = long_url[(long_url.find("://") + 3):] #Strip protocol
        base_url = base_url[: base_url.find("/")] # Strip path
        if db.blocked_urls.find_one({"long_url" : { "$regex" : "%s*" % base_url }}):
            return False

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

        if custom_url:
            # Attempt to insert the custom URL
            if custom_url in ShrunkClient.RESERVED_WORDS:
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

    def modify_url(self, short_url, **kwargs):
        """Modifies an existing URL.

        Edits the values of the url `short_url` and replaces them with the
        values specified in the keyword arguments.

        :Parameters:
          - `short_url`: The ID of the URL to edit.
          - `kwargs`: A dictionary of keyword arguments. The URL will take on
            all values specified.
        """
        db = self._mongo.shrunk_urls
        db.urls.update({"_id" : short_url},
                       {"$set" : kwargs})

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
        result = self.get_url_info(short_url.lower())
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
        """Finds if a user is blacklisted by checking the blacklist collection.
        :Parameters:
          - `netid` A Rutgers NetID

        :Returns
          True if the user is in the blacklist collection, false otherwise.
        """
        db = self._mongo.shrunk_users
        if db.blacklist.find_one({"netid" : netid}) is None:
            return False
        return True

    def blacklist_user(self, netid, banned_by):
        """Adds a user to the blacklist collection.
        :Parameters:
            - `netid`: A Rutgers NetID.
            - `banned_by`: The NetID of the administrator that banned this
              person.
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

    def allow_user(self, netid):
        """Removes a user from the blacklist collection.
        :Parameters:
            - `netid`: A Rutgers NetID.
        """
        db = self._mongo.shrunk_users
        if self.is_blacklisted:
            db.blacklist.remove({'netid' : netid})
            return True
        return False

    def is_admin(self, netid):
        """ Finds if a user is an administrator by checking the administrators
        collection.
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
            - `netid`: A Rutgers NetID.
            - `added_by`: The NetID of the administrator that added this
              person.
        """
        db = self._mongo.shrunk_users
        if not self.is_admin(netid):
            return db.administrators.insert({"netid" : netid, "added_by" :
                added_by})

    def is_blocked(self, url):
        """ Finds if a url is blocked by checking the blocked_urls collection.
        :Parameters:
          - `url`: The url to check.

        :Returns:
          True if the url is in the blocked_urls collection, False
          otherwise.
        """
        db = self._mongo.shrunk_urls
        if db.blocked_urls.find_one({'url' : url}) is None:
            return False
        return True

    def block_link(self, url, blocked_by):
        """Adds a link to the blocked_urls collection.
        :Parameters:
            - `url`: The url to block.
            - `blocked_by`: A Rutgers NetID of the administrators that is doing
              the blocking.
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
            - `url`: The url to allow.
        """
        db = self._mongo.shrunk_urls
        return db.blocked_urls.remove({'url' : { '$regex' : url }})


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
