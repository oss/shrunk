# shrunk - Rutgers University URL Shortener

"""Utility functions for shrunk."""

import logging

from shrunk.client import ShrunkClient
from flask import redirect, session
from functools import wraps

client=None
def get_db_client(app, g = None):
    """Gets a reference to a ShrunkClient for database operations.

    :Parameters:
      - `app`: A Flask application object.
      - `g`: Flask's magical global state object.

    :Returns:
      - A reference to a singleton ShrunkClient.
    """
    #TODO depricate using flask's g
    if not g:
        global client
        if not client:
            client=ShrunkClient(app.config["DB_HOST"], app.config["DB_PORT"])
        return client
    else:
        if not hasattr(g, "client"):
            g.client = ShrunkClient(app.config["DB_HOST"], app.config["DB_PORT"])
            
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

#decorator to check if user is logged in
#it looks like its double wrapped but thats so it can be a decorator that takes in params
def require_login(app):
    def decorate(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            client = get_db_client(app)
            if not 'user' in session:
                return redirect("/shrunk-login")
            if client.is_blacklisted(session["user"].get("netid")):
                return redirect("/unauthorized")
            return func(*args, **kwargs)
        return wrapper
    return decorate

#decorator to check if user is an admin
#it looks like its double wrapped but thats so it can be a decorator that takes in params
def require_admin(app):
    def decorate(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            client = get_db_client(app)
            netid = session["user"].get("netid")
            if client.is_blacklisted(netid):
                return redirect("/unauthorized")
            if not client.is_admin(netid):
                return redirect("/")
            return func(*args, **kwargs)
        return wrapper
    return decorate
