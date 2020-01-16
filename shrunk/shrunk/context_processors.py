""" App-level context processors. """

import flask

from . import roles
from .util import search


def _add_search_params():
    """ Passes search parameters (query, links_set, sortby, page) to every template. """
    d = {k: flask.session[k]
         for k in ['query', 'links_set', 'sortby', 'page']
         if k in flask.session}
    if 'links_set' in flask.session:
        d['selected_links_set'] = search.display_links_set(flask.session['links_set'])
    return d


def _add_user_info():
    """ Passes user info (netid, roles) to every template. """
    try:
        netid = flask.session['user']['netid']
        return {'netid': netid, 'roles': roles.get(netid)}
    except KeyError:
        return {}


def _add_orgs():
    """ Passes organizations to every template. """
    try:
        netid = flask.session['user']['netid']
        client = flask.current_app.get_shrunk()
        if roles.check('admin', netid):
            orgs = client.get_all_organizations()
        else:
            orgs = client.get_member_organizations(netid)
        return {'orgs': orgs}
    except:
        return {}


def init_app(app):
    app.context_processor(_add_search_params)
    app.context_processor(_add_user_info)
    app.context_processor(_add_orgs)
