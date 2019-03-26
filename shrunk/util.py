# shrunk - Rutgers University URL Shortener

"""Utility functions for shrunk."""

import logging
import io
import base64
import pyqrcode
import json


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


def db_to_response_dict(obj):
    # I hate this since it converts to json, then back to dict, then the API
    # converts these dicts to json, but I do not know of a better way right now.
    return {'data': json.loads(obj.to_json())}


def gen_qr(app, short):
    #url = pyqrcode.create("{}/{}".format(app.config["LINKSERVER_URL"], short))
    #raw = io.BytesIO()
    #url.png(raw, scale=8)
    #return str(base64.b64encode(raw.getvalue()))[2:-1]
    return ""
