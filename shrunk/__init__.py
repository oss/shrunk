"""Rutgers University URL Shortener."""

from shrunk.client import ShrunkClient

version_tuple = (0, 1)
"""The current version of shrunk."""
import shrunk.appserver

def create_app():
    return shrunk.appserver.app


def wsgi(*args, **kwargs):
    return create_app()(*args, **kwargs)


if __name__ == '__main__':
    create_app().run()
