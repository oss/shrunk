""" Shrunk, the official URL shortener of Rutgers University. """

from . import app_decorate
from . import context_processors
from . import appserver
from . import orgs
from . import dev_logins
from . import roles
from . import stats
from . import assets
from . import csrf
from . import sso

VERSION_TUPLE = (0, 1)
""" The current version of Shrunk. """


def create_app():
    app = app_decorate.ShrunkFlask(__name__)
    app.config.from_pyfile('config.py', silent=True)

    # set up global context processors
    context_processors.init_app(app)

    # set up blueprints
    app.register_blueprint(appserver.bp)
    app.register_blueprint(orgs.bp)
    app.register_blueprint(dev_logins.bp)
    app.register_blueprint(roles.views.bp)
    app.register_blueprint(stats.bp)

    # set up extensions
    csrf.ext.init_app(app)
    assets.ext.init_app(app)
    sso.ext.init_app(app)

    return app


def wsgi(*args, **kwargs):
    """ The wsgi entry point. """
    app = create_app()
    return app(*args, **kwargs)
