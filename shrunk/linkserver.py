# shrunk - Rutgers University URL Shortener

"""Flask application for the link server."""

from flask import render_template, request, redirect
from shrunk.app_decorate import ShrunkFlaskMini


# Create application
app = ShrunkFlaskMini(__name__)


### Views ###
# route /<short url> handle by shrunkFlaskMini
@app.route("/")
def render_index():
    """Renders the homepage.

    The link server will redirect to the URL for the public URL manager.
    """
    app.logger.info("Redirecting {} to shrunk".format(request.remote_addr))
    return redirect(app.config["SHRUNK_URL"])
