""" Shrunk, the official URL shortener of Rutgers University. """

from . import appserver

VERSION_TUPLE = (0, 1)
""" The current version of shrunk. """


def create_app():
    return appserver.app


def wsgi(*args, **kwargs):
    """ The wsgi entry point. """
    return appserver.app(*args, **kwargs)


if __name__ == '__main__':
    appserver.app.run()
