Tutorial
========

Prerequisites
-------------
Make sure that you have Shrunk :doc:`installed <installation>`. If everything is
going smoothly, you should be able to run the following in the Python shell
without an exception::

    >>> import shrunk

You will also need to have access to Shrunk's database. If you don't have access
to an existing server, you can always run a copy of the database locally.

Shrunk is backed by MongoDB. Install Mongo with your distro's package manager, and
then start the database with:

.. parsed-literal::

    \# systemctl enable --now mongo

This starts MongoDB on localhost on the default port (port 27017).

Connecting to the Database
--------------------------
We can use a :py:class:`ShrunkClient` object to connect to the database::

    >>> from shrunk import ShrunkClient
    >>> client = ShrunkClient()

This establishes a connection to the default host and port. You may also specify
this explicitly::

    >>> client = ShrunkClient("db.example.org", 3306)

Examining Shrunk Data
---------------------
The client provides access to information regarding shortened links, users and
click statistics. This tutorial will focus on analyzing interesting data.

Shrunk can tell you about the links owned by specific users::

    >>> client.count_links(netid="henry")
    2

Calling it without arguments also yields a global statistic::

    >>> client.count_links()
    1460

You can examine the links of a specific person in detail by specifying their
NetID. The result is a ShrunkCursor that can be used to retrieve information
from the database::

    >>> client.get_urls("henry")
    <shrunk.client.ShrunkCursor at 0x7fad35af20b8>

The cursor has convenience functions for sorting and the like. To pull the
actual data, call the `get_results` function, which returns a list containing
the desired information::

    >>> results = client.get_urls("henry").get_results()
    >>> for result in results:
    ...     print("{} -> {}".format(result['_id'], result['long_url']))
    exw9at -> http://rutgers.edu
    p9u28b -> http://sakai.rutgers.edu/portal/site/bbebab5a-4091-43dc-b273

    >>> results[0]
    {'_id': 'exw9at',
     'long_url': 'http://rutgers.edu',
     'netid': 'henry',
     'timeCreated': datetime.datetime(2015, 7, 2, 11, 48, 40, 170000),
     'title': 'Rutgers, the State University of New Jersey',
     'visits': 147}

.. seealso::

    The official API documentation for :doc:`api/client`.
