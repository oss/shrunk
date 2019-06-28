""" Shrunk, the official URL shortener of Rutgers University. """

import shrunk.appserver

VERSION_TUPLE = (0, 1)
""" The current version of shrunk. """

def create_app():
    return shrunk.appserver.app

def wsgi(*args, **kwargs):
    """ The wsgi entry point. """
    return shrunk.appserver.app(*args, **kwargs)

if __name__ == '__main__':
    shrunk.appserver.app.run()
