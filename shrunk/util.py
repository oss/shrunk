# shrunk - Rutgers University URL Shortener

"""Utility functions for shrunk."""

import logging

from shrunk.client import ShrunkClient
from urllib.parse import urlsplit


def get_db_client(app, g):
    """Gets a reference to a ShrunkClient for database operations.

    :Parameters:
      - `app`: A Flask application object.
      - `g`: Flask's magical global state object.

    :Returns:
      - A reference to a singleton ShrunkClient.
    """
    if not hasattr(g, "client"):
        g.client = ShrunkClient(app.config["DB_HOST"], app.config["DB_PORT"])

    if g.client.conn == "off":
        return None

    return g.client


def set_logger(app):
    """Sets a logger with standard settings.

    :Parameters:
      - `app`: A Flask application object.
    """
    handler = logging.FileHandler(app.config["LOG_FILENAME"])
    handler.setLevel(logging.INFO)
    handler.setFormatter(logging.Formatter(app.config["LOG_FORMAT"]))
    app.logger.addHandler(handler)


def formattime(datetime):
    """Utility function for formatting datetimes.

    This formats datetimes to look like "Nov 19 2015".
    """
    return datetime.strftime("%b %d %Y")


def get_domain(uri):
    """Utility function to grab domain from URL.

    Used in application to extract referrer names from requests.
    """
    if uri is None:
        return "unknown"
    try:
        parsed_uri = urlsplit(uri)
        domain = '{0.netloc}'.format(parsed_uri)
        split = domain.split('.')
        if len(split) >= 2:
            domain = split[-2]
        else:
            domain = "unknown"
        return domain
    except:
        return "unknown"
