"""Implements API endpoints under ``/api/link``"""

from datetime import datetime
from typing import Any, Optional, Dict

from flask import Blueprint, jsonify, request
from flask_mailman import Mail
from bson import ObjectId
import bson
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.client.exceptions import (BadLongURLException,
                                      BadAliasException,
                                      NoSuchObjectException,
                                      InvalidACL,
                                      NotUserOrOrg,
                                      SecurityRiskDetected,
                                      LinkIsPendingOrRejected)
from shrunk.util.stats import get_human_readable_referer_domain, browser_stats_from_visits
from shrunk.util.ldap import is_valid_netid
from shrunk.util.decorators import require_login, require_mail, request_schema

__all__ = ['bp']

bp = Blueprint('link', __name__, url_prefix='/api/v1/link')

MIN_ALIAS_LENGTH = 5

MAX_ALIAS_LENGTH = 60

ACL_ENTRY_SCHEMA = {
    'type': 'object',
    'required': ['_id', 'type'],
    'properties' : {
        '_id': {'type': 'string'},
        'type': {'type': 'string', 'enum': ['org', 'netid']}
    }
}

CREATE_LINK_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': ['title', 'long_url'],
    'properties': {
        'title': {'type': 'string', 'minLength': 1},
        'long_url': {'type': 'string', 'minLength': 1},
        'expiration_time': {'type': 'string', 'format': 'date-time'},
        'editors': {'type': 'array', 'items': ACL_ENTRY_SCHEMA},
        'viewers': {'type': 'array', 'items': ACL_ENTRY_SCHEMA},
        'bypass_security_measures': {'type': 'boolean'}
    },
}

@bp.route('', methods=['POST'])
@request_schema(CREATE_LINK_SCHEMA)
@require_login
def create_link(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/link``

    Create a new link. Returns id of created link or errors. Request format:

    .. code-block:: json

       { "title": "string", "long_url": "string",
         "expiration_time": "2020-11-11T11:11:11Z",
         "editors": ["<ACL_ENTRY>"], "viewers": ["<ACL_ENTRY>"]}

    an ACL entry looks like. for orgs the id must be a valid bson ObjectId

    .. code-block:: json

       {"_id": "netid|org_id", "type": "org|user"}

    Success response format:

    .. code-block:: json

       { "id": "string" }

    Error response format:

    .. code-block:: json

       { "errors": ["long_url"] }

    :param netid:
    :param client:
    :param req:
    """
    if 'editors' not in req:
        req['editors'] = []
    if 'viewers' not in req:
        req['viewers'] = []

    if 'bypass_security_measures' not in req:
        req['bypass_security_measures'] = False

    if not client.roles.has('admin', netid) and req['bypass_security_measures']:
        abort(403)

    if 'expiration_time' in req:
        expiration_time: Optional[datetime] = datetime.fromisoformat(req['expiration_time'])
    else:
        expiration_time = None

    # convert _id to objectid for orgs in acls
    try:
        def str2ObjectId(acl):
            return [{'_id': ObjectId(entry['_id']), 'type': entry['type']}
                    if entry['type'] == 'org'
                    else entry
                    for entry in acl]
        req['editors'] = str2ObjectId(req['editors'])
        req['viewers'] = str2ObjectId(req['viewers'])
    except bson.errors.InvalidId as e:
        return jsonify({'errors': ['type org requires _id to be an ObjectId: ' + str(e)]}), 400

    # deduplicate
    def dedupe(acl):
        ids = set()
        result = []
        for entry in acl:
            if entry['_id'] not in ids:
                result.append(entry)
                ids.add(entry['_id'])
        return result
    req['editors'] = dedupe(req['editors'])
    req['viewers'] = dedupe(req['viewers'])

    # make sure editors also have viewer permissions
    viewer_ids = {viewer['_id'] for viewer in req['viewers']}
    for editor in req['editors']:
        if editor['_id'] not in viewer_ids:
            viewer_ids.add(editor['_id'])
            req['viewers'].append(editor)

    try:
        link_id = client.links.create(req['title'], req['long_url'], expiration_time, netid,
                                      request.remote_addr, viewers=req['viewers'], editors=req['editors'],
                                      bypass_security_measures=req['bypass_security_measures'])
    except BadLongURLException:
        return jsonify({'errors': ['long_url']}), 400
    except SecurityRiskDetected:
        return jsonify({'errors': ['This url has been detected to be a potential security \
            risk and requires manual verification. We apologize for the inconvenience and we\'ll\
            verify the link as soon as possible. For more information, contact us at oss@oss.rutgers.edu']}), 403
    except LinkIsPendingOrRejected:
        return jsonify({'errors': ['This url was previously detected to be a potential security risk. \
            The url either is pending verification or has been rejected. For more information, contact us at \
            oss@oss.rutgers.edu']}), 403
    except NotUserOrOrg as e:
        return jsonify({'errors': [str(e)]}), 400
    return jsonify({'id': str(link_id)})


@bp.route('/validate_long_url/<b32:long_url>', methods=['GET'])
@require_login
def validate_long_url(_netid: str, client: ShrunkClient, long_url: str) -> Any:
    """``GET /api/validate_long_url/<b32:long_url>``

    Validate a long URL. This endpoint is used for form validation in the frontend. Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param long_url:
    """
    valid = not client.links.long_url_is_blocked(long_url)
    response: Dict[str, Any] = {'valid': valid}
    if not valid:
        response['reason'] = 'That long URL is not allowed.'
    return jsonify(response)


@bp.route('/<ObjectId:link_id>', methods=['GET'])
@require_login
def get_link(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>``

    Get information about a link. Basically just returns the Mongo document.

    :param netid:
    :param client:
    :param link_id:
    """
    try:
        info = client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
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
        '_id': info['_id'],
        'title': info['title'],
        'long_url': info['long_url'],
        'owner': client.links.get_owner(link_id),
        'created_time': info['timeCreated'],
        'aliases': aliases,
        'deleted': info.get('deleted', False),
        'editors': info['editors'] if 'editors' in info else [],
        'viewers': info['viewers'] if 'viewers' in info else []
    }

    return jsonify(json_info)


@bp.route('/search_by_title/<b32:title>')
@require_login
def get_link_by_title(netid: str, client: ShrunkClient, title: ObjectId) -> Any:
    """``GET /api/link/search_by_title/<title>``

    Finds information of a single link by exact title. This simple method was made for
    security unit tests. This method is NOT mean to be a comprehensive endpoint
    called upon in production.

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.roles.has('admin', netid):
        abort(403)

    doc = client.links.get_link_info_by_title(title)

    if doc is None:
        return jsonify({}), 404

    return jsonify(doc), 200


MODIFY_LINK_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'properties': {
        'title': {'type': 'string', 'minLength': 1},
        'long_url': {'type': 'string', 'format': 'uri'},
        'expiration_time': {'type': ['string', 'null'], 'format': 'date-time'},
        'created_time': {'type': ['string', 'null'], 'format': 'date-time'},
        'owner': {'type': 'string', 'minLength': 1},
    },
}


@bp.route('/<ObjectId:link_id>', methods=['PATCH'])
@request_schema(MODIFY_LINK_SCHEMA)
@require_login
def modify_link(netid: str, client: ShrunkClient, req: Any, link_id: ObjectId) -> Any:
    """``PATCH /api/link/<link_id>``

    Modify an existing link. Returns 204 on success or 403 on error. Request format:

    .. code-block:: json

       { "title?": "string", "long_url?": "string", "expiration_time?": "string | null" }

    Properties present in the request will be set. Properties missing from the request will not
    be modified. If ``"expiration_time"`` is present and set to ``null``, the effect is to remove
    the link's expiration time.

    :param netid:
    :param client:
    :param req:
    :param link_id:
    """
    if 'expiration_time' in req and req['expiration_time'] is not None:
        req['expiration_time'] = datetime.fromisoformat(req['expiration_time'])
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has('admin', netid) and not client.links.may_edit(link_id, netid):
        abort(403)
    if 'owner' in req and not is_valid_netid(req['owner']):
        abort(400)
    try:
        client.links.modify(link_id,
                            title=req.get('title'),
                            long_url=req.get('long_url'),
                            expiration_time=req.get('expiration_time'),
                            owner=req.get('owner'))
        if 'expiration_time' in req and req['expiration_time'] is None:
            client.links.remove_expiration_time(link_id)
    except BadLongURLException:
        abort(400)
    return '', 204


MODIFY_ACL_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': ['entry', 'acl', 'action'],
    'properties': {
        'entry': ACL_ENTRY_SCHEMA,
        'acl': {'type': 'string', 'enum': ['editors', 'viewers']},
        'action': {'type': 'string', 'enum': ['add', 'remove']}
    },
}


@bp.route('/<ObjectId:link_id>/acl', methods=['PATCH'])
@request_schema(MODIFY_ACL_SCHEMA)
@require_login
def modify_acl(netid: str, client: ShrunkClient,
               req: Any, link_id: ObjectId) -> Any:
    """``PATCH /api/link/<link_id>/acl``

    Modify an existing link's acl. Returns 204 on success or 403 on error.
    Request format:

    .. code-block:: json

       { "action": "add|remove", "entry": "<ACL_ENTRY>",
         "acl": "editors|viewers" }

    an ACL entry looks like. for orgs the id must be a valid bson ObjectId

    .. code-block:: json

       { "_id": "netid|org_id", "type": "org|netid" }

    :param netid:
    :param client:
    :param req:
    :param link_id:
    """
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has('admin', netid) and \
       not client.links.may_edit(link_id, netid):
        abort(403)
    try:
        if req['entry']['type'] == 'org':
            req['entry']['_id'] = ObjectId(req['entry']['_id'])
    except bson.errors.InvalidId as e:
        return jsonify({
            'errors': ['org entry requires _id to be ObjectId: ' + str(e)]
        }), 400
    try:
        client.links.modify_acl(link_id,
                                req['entry'],
                                req['action'] == 'add',
                                req['acl'],
                                netid)
    except InvalidACL:
        return jsonify({'errors': ['invalid acl']})
    except NotUserOrOrg as e:
        return jsonify({'errors': ['not user or org: ' + str(e)]}), 400
    return '', 204


@bp.route('/<ObjectId:link_id>', methods=['DELETE'])
@require_login
def delete_link(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``DELETE /api/<link_id>``

    Delete a link. Returns 204 on success and 403 on error.

    :param netid:
    :param client:
    :param link_id:
    """
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has('admin', netid) and not client.links.is_owner(link_id, netid):
        abort(403)
    client.links.delete(link_id, netid)
    return '', 204


@bp.route('/<ObjectId:link_id>/clear_visits', methods=['POST'])
@require_login
def post_clear_visits(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``POST /link/<link_id>/clear_visits``

    Delete all visit data from a link. Returns 204 on success 4xx on error.

    :param netid:
    :param client:
    :param link_id:
    """
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has('admin', netid) and not client.links.is_owner(link_id, netid):
        abort(403)
    client.links.clear_visits(link_id)
    return '', 204


@bp.route('/<ObjectId:link_id>/request_edit_access', methods=['POST'])
@require_mail
@require_login
def post_request_edit(netid: str, client: ShrunkClient, mail: Mail, link_id: ObjectId) -> Any:
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    client.links.request_edit_access(mail, link_id, netid)
    return '', 204


@bp.route('/<ObjectId:link_id>/cancel_request_edit_access', methods=['POST'])
@require_mail
@require_login
def cancel_request_edit(netid: str, client: ShrunkClient, mail: Mail, link_id: ObjectId) -> Any:
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    client.links.cancel_request_edit_access(mail, link_id, netid)
    return '', 204

@bp.route('/<ObjectId:link_id>/active_request_exists', methods=['GET'])
@require_mail
@require_login
def request_exists(netid: str, client: ShrunkClient, mail: Mail, link_id: ObjectId) -> bool:
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    exists = client.links.active_request_exists(mail, link_id, netid)
    return jsonify(exists)

def anonymize_visit(client: ShrunkClient, visit: Any) -> Any:
    """Anonymize a visit by replacing its source IP with an opaque visitor ID.

    :param client:
    :param visit:
    """
    return {
        'link_id': visit['link_id'],
        'alias': visit['alias'],
        'visitor_id': client.links.get_visitor_id(visit['source_ip']),
        'user_agent': visit.get('user_agent', 'Unknown'),
        'referer': get_human_readable_referer_domain(visit),
        'state_code': visit.get('state_code', 'Unknown') if visit.get('country_code') == 'US' else 'Unknown',
        'country_code': visit.get('country_code', 'Unknown'),
        'time': visit['time'],
    }


@bp.route('/<ObjectId:link_id>/visits', methods=['GET'])
@require_login
def get_link_visits(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>/visits``

    Get anonymized visit data associated with a link. Response format:

    .. code-block:: json

       { "visits": [ {
           "link_id": "string",
           "alias": "string",
           "visitor_id": "string",
           "user_agent": "string",
           "referer": "string",
           "state_code": "string",
           "country_code": "string",
           "time": "date-time"
       } ] }

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_visits(link_id)
    anonymized_visits = [anonymize_visit(client, visit) for visit in visits]
    return jsonify({'visits': anonymized_visits})


@bp.route('/<ObjectId:link_id>/stats', methods=['GET'])
@require_login
def get_link_overall_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>/stats``

    Get overall stats associated with a link. Response format:

    .. code-block:: json

       { "total_visits": "number", "unique_visits": "number" }

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    stats = client.links.get_overall_visits(link_id)
    return jsonify(stats)


@bp.route('/<ObjectId:link_id>/stats/visits', methods=['GET'])
@require_login
def get_link_visit_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>/stats/visits``

    Get daily visits information associated with a link. Response format:

    .. code-block:: json

       { "visits": [ {
           "_id": { "year": "number", "month": "number", "day": "number" },
           "all_visits": "number",
           "first_time_visits": "number"
       } ] }

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_daily_visits(link_id)
    return jsonify({'visits': visits})


@bp.route('/<ObjectId:link_id>/stats/geoip', methods=['GET'])
@require_login
def get_link_geoip_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>/stats/geoip``

    Get GeoIP stats associated with a link. Response format:

    .. code-block:: json

       {
         "us": [ { "code": "string", "value": "number" } ],
         "world": [ { "code": "string", "value": "number" } ]
       }

    where the value of ``"code"`` is an ISO country or subdivison code and the value of ``"value"`` is the
    number of visits in that geographic region.

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    geoip = client.links.get_geoip_stats(link_id)
    return jsonify(geoip)


@bp.route('/<ObjectId:link_id>/stats/browser', methods=['GET'])
@require_login
def get_link_browser_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>/stats/browser``

    Get stats about browsers and referers of visitors. Response format:

    .. code-block:: json

       {
         "browsers": [ { "name": "string", "y": "number" } ],
         "platforms": [ { "name": "string", "y": "number" } ],
         "referers": [ { "name": "string", "y": "number" } ]
       }

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_visits(link_id)
    stats = browser_stats_from_visits(visits)
    return jsonify(stats)


CREATE_ALIAS_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
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
    """``POST /api/link/<link_id>/alias``

    Create a new alias for a link. Returns the created alias or an error. Request format:

    .. code-block:: json

       { "alias?": "string", "description?": "string" }

    If the ``"alias"`` field is omitted, the server will generate a random alias. If the ``"description"`` field is
    omitted, it will default to the empty string. Success response format:

    .. code-block:: json

       { "alias": "string" }

    Error response format:

    .. code-block:: json

       { "errors": ["alias"] }

    :param netid:
    :param client:
    :param req:
    :param link_id:
    """
    # Check that netid is able to modify link_id
    if not client.roles.has('admin', netid) and not client.links.may_edit(link_id, netid):
        abort(403)

    # If a custom URL is specified, check that user has power_user or admin role.
    if 'alias' in req and not client.roles.has_some(['admin', 'power_user'], netid):
        abort(403)

    try:
        alias = client.links.create_or_modify_alias(link_id, req.get('alias'), req.get('description', ''))
    except BadAliasException:
        abort(400)

    return jsonify({'alias': alias})


@bp.route('/validate_reserved_alias/<b32:alias>', methods=['GET'])
@require_login
def validate_reserved_alias(_netid: str, client: ShrunkClient, alias: str) -> Any:
    """``GET /api/validate_reserved_alias/<b32:alias>``

    Validate an alias. This endpoint is used for form validation in the frontend. Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param alias:
    """
    valid = not client.links.alias_is_reserved(alias)
    response: Dict[str, Any] = {'valid': valid}

    if not valid:
        response['reason'] = 'That alias cannot be used.'
    return jsonify(response)


@bp.route('/validate_duplicate_alias/<b32:alias>', methods=['GET'])
@require_login
def validate_duplicate_alias(_netid: str, client: ShrunkClient, alias: str) -> Any:
    """``GET /api/validate_duplicate_alias/<b32:alias>``

    Validate an alias. This endpoint is used for form validation in the frontend. Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param alias:
    """
    valid = not client.links.alias_is_duplicate(alias)
    response: Dict[str, Any] = {'valid': valid}

    if not valid:
        response['reason'] = 'That alias already exists.'
    return jsonify(response)


@bp.route('/<ObjectId:link_id>/alias/<alias>', methods=['DELETE'])
@require_login
def delete_alias(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    """``DELETE /api/link/<link_id>/alias/<alias>``

    Delete an alias. Returns 204 on success or 4xx on error.

    :param netid:
    :param client:
    :param link_id:
    :param alias:
    """
    if not client.roles.has('admin', netid) and not client.links.is_owner(link_id, netid):
        abort(403)
    client.links.delete_alias(link_id, alias)
    return '', 204


@bp.route('/<ObjectId:link_id>/alias/<alias>/visits', methods=['GET'])
@require_login
def get_alias_visits(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    """``GET /api/link/<link_id>/alias/<alias>/visits``

    Get anonymized visits for an alias. For response format, see :py:func:`get_link_visits`.

    :param netid:
    :param client:
    :param link_id:
    :param alias:
    """
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_visits(link_id, alias)
    anonymized_visits = [anonymize_visit(client, visit) for visit in visits]
    return jsonify({'visits': anonymized_visits})


@bp.route('/<ObjectId:link_id>/alias/<alias>/stats', methods=['GET'])
@require_login
def get_alias_overall_stats(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    """``GET /api/link/<link_id>/alias/<alias>/stats``

    Get number of total and unique visits to an alias. For response format, see :py:func:`get_link_overall_stats`.

    :param netid:
    :param client:
    :param link_id:
    :param alias:
    """
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    stats = client.links.get_overall_visits(link_id, alias)
    return jsonify(stats)


@bp.route('/<ObjectId:link_id>/alias/<alias>/stats/visits', methods=['GET'])
@require_login
def get_alias_visit_stats(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    """``GET /api/link/<link_id>/alias/<alias>/stats/visits``

    Get visit statistics for an alias. For response format, see :py:func:`get_alias_visit_stats`.

    :param netid:
    :param client:
    :param link_id:
    :param alias:
    """
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_daily_visits(link_id, alias)
    return jsonify({'visits': visits})


@bp.route('/<ObjectId:link_id>/alias/<alias>/stats/geoip', methods=['GET'])
@require_login
def get_alias_geoip_stats(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    """``GET /api/link/<link_id>/alias/<alias>/stats/geoip``

    Get GeoIP statistics for an alias. For response format, see :py:func:`get_link_geoip_stats`.

    :param netid:
    :param client:
    :param link_id:
    :param alias:
    """
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    geoip = client.links.get_geoip_stats(link_id, alias)
    return jsonify(geoip)


@bp.route('/<ObjectId:link_id>/alias/<alias>/stats/browser', methods=['GET'])
@require_login
def get_alias_browser_stats(netid: str, client: ShrunkClient, link_id: ObjectId, alias: str) -> Any:
    """``GET /api/link/<link_id>/alias/<alias>/stats/browser``

    Get stats about browsers and referers of visitors. For response format, see :py:func:`get_link_browser_stats`.

    :param netid:
    :param client:
    :param link_id:
    :param alias:
    """
    if not client.roles.has('admin', netid) and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_visits(link_id, alias)
    stats = browser_stats_from_visits(visits)
    return jsonify(stats)
