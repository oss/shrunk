import collections

import flask
import werkzeug.useragents

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

    if "url" not in flask.request.args:
        return '{"error":"request must have url"}', 400
    url = flask.request.args['url']
    if not client.is_owner_or_admin(url, netid):
        return util.unauthorized()
    visits = client.get_daily_visits(url)
    return flask.jsonify(visits)


@bp.route('/geoip', endpoint='geoip', methods=['GET'])
@require_login
def get_geoip_json(netid, client):
    url = flask.request.args.get('url')
    if not url:
        return flask.jsonify({'error': 'no url'}), 400
    if not client.is_owner_or_admin(url, netid):
        return flask.jsonify({'error': 'forbidden'}), 403
    return flask.jsonify(client.get_geoip_json(url))


@bp.route('/referer', endpoint='referer', methods=['GET'])
@require_login
def get_referer_stats(netid, client):
    """ Get a JSON dictionary describing the domains of the referers
        of visits to the given URL. """

    if 'url' not in flask.request.args:
        return 'error: request must have url', 400
    link = flask.request.args['url']

    if not client.is_owner_or_admin(link, netid):
        return util.unauthorized()

    stats = collections.defaultdict(int)
    for visit in client.get_visits(link):
        domain = stat.get_referer_domain(visit)
        if domain:
            stats[domain] += 1
        else:
            stats['unknown'] += 1

    return flask.jsonify(stats)


@bp.route('/useragent', endpoint='useragent', methods=['GET'])
@require_login
def get_useragent_stats(netid, client):
    """ Return a JSON dictionary describing the user agents, platforms,
        and browsers that have visited the given link. """

    if 'url' not in flask.request.args:
        return 'error: request must have url', 400
    link = flask.request.args['url']

    if not client.is_owner_or_admin(link, netid):
        return util.unauthorized()

    stats = collections.defaultdict(lambda: collections.defaultdict(int))
    for visit in client.get_visits(link):
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

    if 'url' not in flask.request.args:
        return 'error: request must have url', 400
    link = flask.request.args['url']
    if not client.is_owner_or_admin(link, netid):
        return util.unauthorized()
    csv_output = stat.make_csv_for_links(client, [link])
    return util.make_plaintext_response(csv_output, filename='visits-{}.csv'.format(link))


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
