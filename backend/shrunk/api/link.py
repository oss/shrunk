"""This module implements API endpoints under /link."""

from datetime import datetime
from typing import Any, Optional, Dict

from flask import Blueprint, jsonify, request
from bson import ObjectId
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.client.exceptions import ShrunkException, BadLongURLException, BadAliasException
from shrunk.util.stats import get_human_readable_referer_domain, browser_stats_from_visits
from shrunk.util.decorators import require_login, request_schema

__all__ = ['bp']

bp = Blueprint('link', __name__, url_prefix='/api/v1/link')

MIN_ALIAS_LENGTH = 5

MAX_ALIAS_LENGTH = 60

CREATE_LINK_SCHEMA = {
    'type': 'object',
    'required': ['title', 'long_url'],
    'properties': {
        'title': {'type': 'string'},  # , 'minLength': 1},
        'long_url': {'type': 'string'},  # , 'format': 'uri'},
        # 'expiration_time': {'type': 'string', 'format': 'date-time'},
    },
}


@bp.route('', methods=['POST'])
@request_schema(CREATE_LINK_SCHEMA)
@require_login
def create_link(netid: str, client: ShrunkClient, req: Any) -> Any:
    if 'expiration_time' in req:
        expiration_time: Optional[datetime] = datetime.fromisoformat(req['expiration_time'])
    else:
        expiration_time = None
    try:
        link_id = client.links.create(req['title'], req['long_url'], expiration_time, netid, request.remote_addr)
    except BadLongURLException:
        return jsonify({'errors': ['long_url']}), 400
    except ShrunkException:
        abort(400)
    return jsonify({'id': str(link_id)})


@bp.route('/validate_alias/<b32:alias>', methods=['GET'])
@require_login
def validate_alias(_netid: str, client: ShrunkClient, alias: str) -> Any:
    valid = not client.links.alias_is_reserved(alias)
    response: Dict[str, Any] = {'valid': valid}
    if not valid:
        response['reason'] = 'That alias is not allowed.'
    return jsonify(response)


@bp.route('/validate_long_url/<b32:long_url>', methods=['GET'])
@require_login
def validate_long_url(_netid: str, client: ShrunkClient, long_url: str) -> Any:
    valid = not client.links.long_url_is_blocked(long_url)
    response: Dict[str, Any] = {'valid': valid}
    if not valid:
        response['reason'] = 'That long URL is not allowed.'
    return jsonify(response)


@bp.route('/<ObjectId:link_id>', methods=['GET'])
@require_login
def get_link(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    try:
        info = client.links.get_link_info(link_id)
    except ShrunkException:
        abort(404)

    if not client.roles.has('admin', netid):
        if info['deleted']:
            abort(404)
        aliases = [{'alias': alias['alias'], 'description': alias.get('description', ''), 'deleted': False}
                   for alias in info['aliases'] if not alias['deleted']]
    else:
        aliases = [{'alias': alias['alias'], 'description': alias.get('description', ''), 'deleted': alias['deleted']}
                   for alias in info['aliases']]

    # Get rid of types that cannot safely be passed to jsonify
    json_info = {
        '_id': str(info['_id']),
        'aliases': aliases,
    }

    return jsonify(json_info)


MODIFY_LINK_SCHEMA = {
    'type': 'object',
    'properties': {
        'title': {'type': 'string', 'minLength': 1},
        'long_url': {'type': 'string', 'format': 'uri'},
        'expiration_time': {'type': ['string', 'null'], 'format': 'date-time'},
    },
}


@bp.route('/<ObjectId:link_id>', methods=['PATCH'])
@request_schema(MODIFY_LINK_SCHEMA)
@require_login
def modify_link(netid: str, client: ShrunkClient, req: Any, link_id: ObjectId) -> Any:
    if 'expiration_time' in req and req['expiration_time'] is not None:
        req['expiration_time'] = datetime.fromisoformat(req['expiration_time'])
    if not client.roles.has('admin', netid) and not client.links.is_owner(link_id, netid):
        abort(403)
    try:
        client.links.modify(link_id,
                            title=req.get('title'),
                            long_url=req.get('long_url'),
                            expiration_time=req.get('expiration_time'))
        if 'expiration_time' in req and req['expiration_time'] is None:
            client.links.remove_expiration_time(link_id)
    except ShrunkException:
        abort(403)
    return '', 204


@bp.route('/<ObjectId:link_id>', methods=['DELETE'])
@require_login
def delete_link(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    if not client.roles.has('admin', netid) and not client.links.is_owner(link_id, netid):
        abort(403)
    try:
        client.links.delete(link_id, netid)
    except ShrunkException:
        abort(403)
    return '', 204


@bp.route('/<ObjectId:link_id>/clear_visits', methods=['POST'])
@require_login
def post_clear_visits(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    if not client.roles.has('admin', netid) and not client.links.is_owner(link_id, netid):
        abort(403)
    try:
        client.links.clear_visits(link_id)
    except ShrunkException:
        abort(404)
    return '', 204


def anonymize_visit(client: ShrunkClient, visit: Any) -> Any:
    return {
        'link_id': str(visit['link_id']),
        'alias': visit['alias'],
        'visitor_id': client.links.get_visitor_id(visit['source_ip']),
        'user_agent': visit.get('user_agent', 'Unknown'),
        'referer': get_human_readable_referer_domain(visit),
        'state_code': visit.get('state_code', 'Unknown') if visit.get('country_code') == 'US' else 'Unknown',
        'country_code': visit.get('country_code', 'Unknown'),
        'time': str(visit['time']),
    }


@bp.route('/<ObjectId:link_id>/visits', methods=['GET'])
@require_login
def get_link_visits(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_visits(link_id)
    anonymized_visits = [anonymize_visit(client, visit) for visit in visits]
    return jsonify({'visits': anonymized_visits})


@bp.route('/<ObjectId:link_id>/stats', methods=['GET'])
@require_login
def get_link_overall_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    stats = client.links.get_overall_visits(link_id)
    return jsonify(stats)


@bp.route('/<ObjectId:link_id>/stats/visits', methods=['GET'])
@require_login
def get_link_visit_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_daily_visits(link_id)
    return jsonify({'visits': visits})


@bp.route('/<ObjectId:link_id>/stats/geoip', methods=['GET'])
@require_login
def get_link_geoip_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    geoip = client.links.get_geoip_stats(link_id)
    return jsonify(geoip)


@bp.route('/<ObjectId:link_id>/stats/browser', methods=['GET'])
@require_login
def get_link_browser_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_visits(link_id)
    stats = browser_stats_from_visits(visits)
    return jsonify(stats)


CREATE_ALIAS_SCHEMA = {
    'type': 'object',
    'properties': {
        'alias': {
            'type': 'string',
            'minLength': MIN_ALIAS_LENGTH,
            'maxLength': MAX_ALIAS_LENGTH,
            'pattern': '^[a-zA-Z0-9_.,-]*$',
        },
        'description': {'type': 'string'},
    },
}


@bp.route('/<ObjectId:link_id>/alias', methods=['POST'])
@request_schema(CREATE_ALIAS_SCHEMA)
@require_login
def create_alias(netid: str, client: ShrunkClient, req: Any, link_id: ObjectId) -> Any:
    # Check that netid is able to modify link_id
    if not client.roles.has('admin', netid) and not client.links.is_owner(link_id, netid):
        abort(403)

    # If a custom URL is specified, check that user has power_user or admin role.
    if 'alias' in req and not client.roles.has_some(['admin', 'power_user'], netid):
        abort(403)

    try:
        alias = client.links.create_or_modify_alias(link_id, req.get('alias'), req.get('description', ''))
    except BadAliasException:
        return jsonify({'errors': ['alias']}), 400
    except ShrunkException:
        abort(400)

    return jsonify({'alias': alias})


@bp.route('/<ObjectId:link_id>/alias/<alias>', methods=['DELETE'])
@require_login
def delete_alias(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    if not client.roles.has('admin', netid) and not client.links.is_owner(link_id, netid):
        abort(403)
    client.links.delete_alias(link_id, alias)
    return '', 204


@bp.route('/<ObjectId:link_id>/alias/<alias>/visits', methods=['GET'])
@require_login
def get_alias_visits(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_visits(link_id, alias)
    anonymized_visits = [anonymize_visit(client, visit) for visit in visits]
    return jsonify({'visits': anonymized_visits})


@bp.route('/<ObjectId:link_id>/alias/<alias>/stats', methods=['GET'])
@require_login
def get_alias_overall_stats(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    stats = client.links.get_overall_visits(link_id, alias)
    return jsonify(stats)


@bp.route('/<ObjectId:link_id>/alias/<alias>/stats/visits', methods=['GET'])
@require_login
def get_alias_visit_stats(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_daily_visits(link_id, alias)
    return jsonify({'visits': visits})


@bp.route('/<ObjectId:link_id>/alias/<alias>/stats/geoip', methods=['GET'])
@require_login
def get_alias_geoip_stats(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    geoip = client.links.get_geoip_stats(link_id, alias)
    return jsonify(geoip)


@bp.route('/<ObjectId:link_id>/alias/<alias>/stats/browser', methods=['GET'])
@require_login
def get_alias_browser_stats(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_visits(link_id, alias)
    stats = browser_stats_from_visits(visits)
    return jsonify(stats)
