# shrunk - Rutgers University URL Shortener

"""Flask application for the link server."""

from flask import Flask, render_template, request, redirect, g
import shrunk.util
from shrunk.models import Url
from shrunk.client import visit
from mongoengine import connect, DoesNotExist


# Create application
app = Flask(__name__)

# Import settings in config.py
app.config.from_pyfile("config.py", silent=True)
app.secret_key = app.config['SECRET_KEY']

# Initialize logging
shrunk.util.set_logger(app)

# Connect to mongo
if app.config["DB_REPL"] != "":
    connect(app.config["DB_DATABASE"], host=app.config["DB_HOST"], 
            port=app.config["DB_PORT"], replicaset=app.config["DB_REPL"])
else:
    connect(app.config["DB_DATABASE"], host=app.config["DB_HOST"], 
            port=app.config["DB_PORT"])


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
    app.logger.info("{} requests {}".format(request.remote_addr, short_url))

    # Perform a lookup and redirect
    try:
        url = Url.objects.get(short_url=short_url)
    except DoesNotExist:
        return render_template("link-404.html", short_url=short_url)
    
    visit(url, request.remote_addr)

    # Check if a protocol exists
    if "://" in url.long_url:
        return redirect(url.long_url)
    else:
        return redirect("http://{}".format(url.long_url))


@app.route("/")
def render_index():
    """Renders the homepage.

    The link server will redirect to the URL for the public URL manager.
    """
    app.logger.info("Redirecting {} to shrunk".format(request.remote_addr))
    return redirect(app.config["SHRUNK_URL"])
