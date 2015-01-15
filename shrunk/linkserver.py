""" shRUnk - Rutgers University URL Shortener

Sets up a Flask application for the link server.
"""
import logging

from flask import Flask, render_template, request, redirect, g

import shrunk.client


# Create application
app = Flask(__name__)

# Import settings in config.py
app.config.from_pyfile("config.py", silent=True)
app.secret_key = app.config['SECRET_KEY']

# Initialize logging
format = "%(levelname)s %(asctime)s: %(message)s [in %(pathname)s:%(lineno)d]"
handler = logging.FileHandler("shrunk.log")
handler.setLevel(logging.INFO)
handler.setFormatter(logging.Formatter(format))
app.logger.addHandler(handler)


def get_dbclient():
    """Gets a reference to a ShrunkClient for database operations."""
    if not hasattr(g, "client"):
        g.client = shrunk.client.ShrunkClient(app.config["DB_HOST"], app.config["DB_PORT"])

    return g.client


### Views ###
@app.route("/<short_url>")
def redirect_link(short_url):
    """Redirects to the short URL's true destination.

    This looks up the short URL's destination in the database and performs a
    redirect, logging some information at the same time. If no such link exists,
    a not found page is shown.

    :Parameters:
      - `short_url`: A string containing a shrunk-ified URL.
    """
    client = get_dbclient()
    app.logger.info("{} requests {}".format(request.remote_addr, short_url))

    # Perform a lookup and redirect
    long_url = client.get_long_url(short_url.upper())
    if long_url is None:
        return render_template("notfound.html", short_url=short_url)
    else:
        client.visit(short_url, request.remote_addr)
        return redirect(long_url)


@app.route("/")
def render_index():
    """Renders the homepage.

    The link server will redirect to the URL for the public URL manager.
    """
    app.logger.info("Redirecting {} to shrunk".format(request.remote_addr))
    return redirect(app.config["SHRUNK_URL"])
