# shrunk - Rutgers University URL Shortener

"""Flask application for the link server."""

from flask import request, redirect

from .app_decorate import ShrunkFlaskMini


# Create application
app = ShrunkFlaskMini(__name__)


# ===== Views =====
# route /<short url> handle by shrunkFlaskMini
@app.route('/')
def render_index():
    """Renders the homepage.

    The link server will redirect to the URL for the public URL manager.
    """
    app.logger.info(f'Redirecting {request.remote_addr} to shrunk')
    return redirect(app.config['SHRUNK_URL'])
