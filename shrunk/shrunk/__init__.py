""" Shrunk, the official URL shortener of Rutgers University. """

import flask
from werkzeug.middleware.proxy_fix import ProxyFix


# App-level stuff
from . import app_decorate
from . import context_processors

# Blueprints
from . import appserver
from . import orgs
from . import dev_logins
from . import stats
from .roles import views

# Extensions
from . import assets
from . import csrf
from . import sso


VERSION_TUPLE = (1, 0, 0)
""" The current version of Shrunk. """


def create_app(config_path='config.py', **kwargs):
    app = app_decorate.ShrunkFlask(__name__)
    app.config.from_pyfile(config_path, silent=True)
    app.config.update(kwargs)

    # wsgi middleware
    app.wsgi_app = ProxyFix(app.wsgi_app)

    # set up global context processors
    context_processors.init_app(app)

    # set up blueprints
    app.register_blueprint(appserver.bp)
    app.register_blueprint(orgs.bp)
    app.register_blueprint(dev_logins.bp)
    app.register_blueprint(views.bp)
    app.register_blueprint(stats.bp)

    # set up extensions
    csrf.ext.init_app(app)
    if app.config.get('TESTING') and app.config.get('DISABLE_CSRF_PROTECTION'):
        # We only allow CSRF protection to be disabled in testing mode.
        app.config['WTF_CSRF_ENABLED'] = False
    assets.ext.init_app(app)
    sso.ext.init_app(app)

    # set up error handlers
    @app.errorhandler(400)
    def http400_bad_request(e):
        return flask.render_template('errors/400_bad_request.html'), 400

    @app.errorhandler(403)
    def http403_forbidden(e):
        return flask.render_template('errors/403_forbidden.html'), 403

    @app.errorhandler(404)
    def http404_not_found(e):
        return flask.render_template('errors/404_not_found.html'), 404

    return app
