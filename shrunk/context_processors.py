""" App-level context processors. """

import flask

from .util import search


def _add_search_params():
    """Passes search parameters (query, links_set, sortby, page, show_expired_links) to every template."""
    d = {k: flask.session[k]
         for k in ['query', 'links_set', 'sortby', 'page', 'show_expired_links']
         if k in flask.session}
    if 'links_set' in flask.session:
        d['selected_links_set'] = search.display_links_set(flask.session['links_set'])
    return d


def _add_user_info():
    """Passes user info (netid, roles) to every template."""
    try:
        netid = flask.session['user']['netid']
        return {'netid': netid, 'roles': flask.current_app.get_shrunk().get_roles(netid)}
    except KeyError:
        return {}


def _add_orgs():
    """Passes organizations to every template."""
    try:
        netid = flask.session['user']['netid']
        client = flask.current_app.get_shrunk()
        if client.check_role('admin', netid):
            orgs = client.get_all_organizations()
        else:
            orgs = client.get_member_organizations(netid)
        return {'orgs': orgs}
    except KeyError:
        return {}


def _add_sortby_map():
    return {'SORTBY_MAP': {
        '0': 'Newest first',
        '1': 'Oldest first',
        '2': 'A-Z',
        '3': 'Z-A',
        '4': 'Increasing visits',
        '5': 'Decreasing visits'
    }}


def init_app(app):
    app.context_processor(_add_search_params)
    app.context_processor(_add_user_info)
    app.context_processor(_add_orgs)
    app.context_processor(_add_sortby_map)
