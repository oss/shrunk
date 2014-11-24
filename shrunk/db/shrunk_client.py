""" PyShrunk - Rutgers University URL Shortener

Implements database-level interactions for the shrunk application.
"""

class ShrunkClient(object):
    """A class for database interactions."""

    def __init__(self, host=None, port=None):
        """
        Create a new client connection.

        :Parameters:
          - `host` (optional): the hostname to connect to; defaults to
            "localhost"
          - `port` (optional): the port to connect to on the server; defaults to
            the database default if not present
        """
        pass

    def create_short_url(self, long_url, netid=None):
        """Given a long URL, create a new short URL.
        
        Randomly creates a new short URL and updates the Shrunk database.

        :Parameters:
          - `long_url`: The original URL to shrink.
          - `netid` (optional): The creator of this URL.

        :Returns:
          The shortened URL, or None if an error occurs.
        """
        pass

    def delete_url(self, short_url):
        """Given a short URL, delete it from the database.

        This deletes all information associated with the short URL and wipes all
        appropriate databases.
        
        :Parameters:
          - `short_url`: The shortened URL to dete.

        :Returns:
          A response in JSON detailing the effect of the database operations.
        """
        pass

    def delete_user_urls(self, netid):
        """Deletes all URLs associated with a given NetID.

        The response, encoded as a JSON-compatible Python dict, will at least
        contained an "nRemoved" indicating the number of records removed.

        :Parameters:
          - `netid`: The NetID of the URLs to delete.
        
        :Returns:
          A response in JSON detailing the effect of the database operations.
        """
        pass

    def get_url_info(self, short_url):
        """Given a short URL, return information about it.

        This returns a dictionary containing the following fields:
          - url : The original unshrunk URL
          - timeCreated: The time the URL was created, expressed as an ISODate
            instance
          - netid : If it exists, the creator of the shortened URL
          - visits : The number of visits to this URL

        :Parameters:
          - `short_url`: A shortened URL.
        """
        pass

    def get_long_url(self, short_url):
        """Given a short URL, returns the long URL."""
        pass

    def get_visits(self, short_url):
        """Returns all visit information to the given short URL."""
        pass

    def get_num_visits(self, short_url):
        """Given a short URL, return the number of visits.
        
        :Parameters:
          A shortened URL obtained from Shrunk.

        :Returns:
          A nonnegative integer indicating the number of times the URL has been
          visited, or None if the URL does not exist in the database.
        """
        pass

    def get_urls(self, netid):
        """Gets all the URLs created by the given NetID.
        
        The return value is a JSON-like Python dictionary.
        """
        pass

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
        pass

    @staticmethod
    def _aggregate(collection, query):
        """Performs an aggregation on the database.

        This performs an aggregation on the database. This ensures that errors
        and failed queries are handled in a uniform fashion.
        """
        pass

    @staticmethod
    def _generate_unique_key():
        """Generates a unique key in the database."""
        pass
