# shrunk - Rutgers University URL Shortener

"""Utility functions for shrunk."""

import logging

from shrunk.client import ShrunkClient


def get_db_client(app, g):
    """Gets a reference to a ShrunkClient for database operations.

    :Parameters:
      - `app`: A Flask application object.
      - `g`: Flask's magical global state object.

    :Returns:
      - A reference to a singleton ShrunkClient.
    """
    if not hasattr(g, "client"):
      if app.config["DB_REPL"] != "":
        g.client = ShrunkClient(None, None, app.config["DB_REPL"])
      else:
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
