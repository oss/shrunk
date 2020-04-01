""" Shrunk, the official URL shortener of Rutgers University. """

import logging

import flask
from flask.logging import default_handler
from werkzeug.middleware.proxy_fix import ProxyFix

# App-level stuff
from . import app_decorate
from . import context_processors

# Blueprints
from . import appserver
from . import orgs
from . import dev_logins
from . import stats
from . import roles

# Extensions
from . import csrf
from . import sso
from .webpack_loader import WebpackLoader


class RequestFormatter(logging.Formatter):
    def format(self, record):
        record.url = None
        record.remote_addr = None
        record.user = None
        if flask.has_request_context():
            record.url = flask.request.url
            record.remote_addr = flask.request.remote_addr
            if 'user' in flask.session:
                record.user = flask.session['user']['netid']
        return super().format(record)


def create_app(config_path='config.py', **kwargs):
    app = app_decorate.ShrunkFlask(__name__, static_url_path='/app/static')
    app.config.from_pyfile(config_path, silent=False)
    app.config.update(kwargs)

    formatter = RequestFormatter(
        '[%(asctime)s] [%(user)s@%(remote_addr)s] [%(url)s] %(levelname)s '
        + 'in %(module)s: %(message)s'
    )
    default_handler.setFormatter(formatter)

    # wsgi middleware
    app.wsgi_app = ProxyFix(app.wsgi_app)

    # set up global context processors
    context_processors.init_app(app)

    # set up blueprints
    app.register_blueprint(appserver.bp)
    app.register_blueprint(orgs.bp)
    app.register_blueprint(dev_logins.bp)
    app.register_blueprint(stats.bp)
    app.register_blueprint(roles.bp)

    # set up extensions
    csrf.ext.init_app(app)
    sso.ext.init_app(app)

    # set up webpack loader
    WebpackLoader(app)

    # redirect / to /app
    @app.route('/', methods=['GET'])
    def redirect_to_real_index():
        return flask.redirect('/app')

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

    @app.before_request
    def record_visit():
        netid = flask.session['user']['netid'] if 'user' in flask.session else None
        endpoint = flask.request.endpoint or 'error'
        app.get_shrunk().record_visit(netid, endpoint)

    return app
