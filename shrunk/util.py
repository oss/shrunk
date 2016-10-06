# shrunk - Rutgers University URL Shortener

"""Utility functions for shrunk."""

import logging
import io
import base64

import pyqrcode

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
        g.client = ShrunkClient(None, None, app.config["DB_REPL"], app.config["GEO_DB_PATH"])
      else:
        g.client = ShrunkClient(app.config["DB_HOST"], app.config["DB_PORT"], None, app.config["GEO_DB_PATH"])

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

def gen_qr(app, short):
    url = pyqrcode.create("{}/{}".format(app.config["LINKSERVER_URL"], short))
    raw = io.BytesIO()
    url.png(raw, scale=8)
    return str(base64.b64encode(raw.getvalue()))[2:-1]
