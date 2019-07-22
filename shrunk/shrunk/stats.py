import collections

import flask
import werkzeug.useragents
from werkzeug.exceptions import abort

from . import util
from .util import stat
from .util import search
from .decorators import require_login


bp = flask.Blueprint('stat', __name__, url_prefix='/stat')


@bp.route('/visits/daily', methods=['GET'])
@require_login
def daily_visits(netid, client):
    """ Returns a JSON dictionary describing the daily
        visits to the given link. """

    url = flask.request.args.get('url')
    if not url:
        abort(400)
    if not client.may_view_url(url, netid):
        abort(403)
    visits = client.get_daily_visits(url)
    return flask.jsonify(visits)


@bp.route('/geoip', endpoint='geoip', methods=['GET'])
@require_login
def get_geoip_json(netid, client):
    url = flask.request.args.get('url')
    if not url:
        abort(400)
    if not client.may_view_url(url, netid):
        abort(403)
    return flask.jsonify(client.get_geoip_json(url))


# TODO: probably store parsed and normalized referer data
# in mongo, so we can replace this with a (much faster)
# aggregation.
@bp.route('/referer', endpoint='referer', methods=['GET'])
@require_login
def get_referer_stats(netid, client):
    """ Get a JSON dictionary describing the domains of the referers
        of visits to the given URL. """

    url = flask.request.args.get('url')
    if not url:
        abort(400)

    if not client.may_view_url(url, netid):
        abort(403)

    stats = collections.defaultdict(int)
    for visit in client.get_visits(url):
        domain = stat.get_referer_domain(visit)
        if domain:
            stats[domain] += 1
        else:
            stats['unknown'] += 1

    # Return the top five referers.
    # XXX is this something we want to keep?
    freqs = sorted(stats.values())
    if len(freqs) >= 5:
        cutoff = freqs[-5]
        stats = {key: value for key, value in stats.items() if value >= cutoff}

    return flask.jsonify(stats)


@bp.route('/useragent', endpoint='useragent', methods=['GET'])
@require_login
def get_useragent_stats(netid, client):
    """ Return a JSON dictionary describing the user agents, platforms,
        and browsers that have visited the given link. """

    url = flask.request.args.get('url')
    if not url:
        abort(400)

    if not client.may_view_url(url, netid):
        abort(403)

    stats = collections.defaultdict(lambda: collections.defaultdict(int))
    for visit in client.get_visits(url):
        user_agent = visit.get('user_agent')
        if not user_agent:
            stats['platform']['unknown'] += 1
            stats['browser']['unknown'] += 1
            continue
        user_agent = werkzeug.useragents.UserAgent(user_agent)
        if user_agent.platform:
            stats['platform'][user_agent.platform.title()] += 1
        if user_agent.browser:
            if 'Edge' in visit['user_agent']:
                stats['browser']['Msie'] += 1
            else:
                stats['browser'][user_agent.browser.title()] += 1

    return flask.jsonify(stats)


@bp.route('/csv/link', endpoint='link-csv', methods=['GET'])
@require_login
def link_visits_csv(netid, client):
    """ Get CSV-formatted data describing (anonymized) visitors to the link. """

    url = flask.request.args.get('url')
    if not url:
        abort(400)

    if not client.may_view_url(url, netid):
        abort(403)
    csv_output = stat.make_csv_for_links(client, [url])
    return util.make_plaintext_response(csv_output, filename=f'visits-{url}.csv')


@bp.route('/csv/search', endpoint='search-csv', methods=['GET'])
@require_login
def search_visits_csv(netid, client):
    """ Get CSV-formatted data describing (anonymized) visitors to the current
        search results. """

    links = list(search.search(netid, client, flask.request, flask.session, should_paginate=False))
    total_visits = sum(map(lambda l: l['visits'], links))
    max_visits = flask.current_app.config['MAX_VISITS_FOR_CSV']
    if total_visits >= max_visits:
        return 'error: too many visits to create CSV', 400

    csv_output = stat.make_csv_for_links(client, map(lambda l: l['_id'], links))
    return util.make_plaintext_response(csv_output, filename='visits-search.csv')
