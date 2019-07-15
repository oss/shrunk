""" App-level context processors. """

import flask

from . import roles


def _add_search_params():
    """ Passes search parameters (query, links_set, sortby, page) to every template. """
    return {k: flask.session[k]
            for k in ['query', 'links_set', 'sortby', 'page']
            if k in flask.session}


def _add_user_info():
    """ Passes user info (netid, roles) to every template. """
    try:
        netid = flask.session['user']['netid']
        return {'netid': netid, 'roles': roles.get(netid)}
    except KeyError:
        return {}


def init_app(app):
    app.context_processor(_add_search_params)
    app.context_processor(_add_user_info)
