"""Implements API endpoints under ``/api/org``"""

from typing import Any, Dict

from flask import Blueprint, jsonify
from werkzeug.exceptions import abort
from bson import ObjectId

from shrunk.client import ShrunkClient
from shrunk.util.ldap import is_valid_netid
from shrunk.util.decorators import require_login, request_schema

__all__ = ['bp']

bp = Blueprint('org', __name__, url_prefix='/api/v1/org')

LIST_ORGS_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': ['which'],
    'properties': {
        'which': {
            'type': 'string',
            'enum': ['user', 'all'],
        },
    },
}


@bp.route('/list', methods=['POST'])
@request_schema(LIST_ORGS_SCHEMA)
@require_login
def get_orgs(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/org/list``

    Lists organizations. Request format:

    .. code-block:: json

       { "which": "'user' | 'all'" }

    where the ``"which"`` property specifies whether to return information about all organizations
    or only organizations of which the requesting user is a member. Only administrators may use the ``"all"``
    option. Response format:

    .. code-block:: json

       { "orgs": [ {
           "id": "string",
           "name": "string",
           "is_member": "boolean",
           "is_admin": "boolean",
           "timeCreated": "date-time",
           "members": [
             { "netid": "string", "timeCreated": "date-time", "is_admin": "boolean" }
           ]
         } ]
       }

    Where the top-level ``"is_member"`` and ``"is_admin"`` properties specify respectively whether the requesting
    user is a member and/or an administrator of the organization.

    :param netid:
    :param client:
    :param req:
    """
    if req['which'] == 'all' and not client.roles.has('admin', netid):
        abort(403)
    orgs = client.orgs.get_orgs(netid, req['which'] == 'user')
    return jsonify({'orgs': orgs})


CREATE_ORG_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': ['name'],
    'properties': {
        'name': {
            'type': 'string',
            'pattern': '^[a-zA-Z0-9_.,-]*$',
            'minLength': 1,
        },
    },
}


@bp.route('', methods=['POST'])
@request_schema(CREATE_ORG_SCHEMA)
@require_login
def post_org(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/org``

    Create a new organization. The requesting user is automatically an administrator of the
    newly-created organization. Returns the ID of the created organization. Request format:

    .. code-block:: json

       { "name": "string" }

    Response format:

    .. code-block:: json

       { "id": "string" }

    :param netid:
    :param client:
    :param req:
    """
    if not client.roles.has_some(['facstaff', 'admin'], netid):
        abort(403)
    org_id = client.orgs.create(req['name'])
    if org_id is None:
        abort(409)
    client.orgs.create_member(org_id, netid, is_admin=True)
    return jsonify({'id': org_id, 'name': req['name']})


@bp.route('/<ObjectId:org_id>', methods=['DELETE'])
@require_login
def delete_org(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``DELETE /api/org/<org_id>``

    Delete an organization. Returns 204 on success.

    :param netid:
    :param client:
    :param org_id:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    client.orgs.delete(org_id)
    return '', 204


@bp.route('/<ObjectId:org_id>', methods=['GET'])
@require_login
def get_org(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``GET /api/org/<org_id>``

    Get information about an organization. For response format, see :py:func:`get_orgs`.

    :param netid:
    :param client:
    :param org_id:
    """
    if not client.orgs.is_member(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    org = client.orgs.get_org(org_id)
    if org is None:
        abort(404)
    org['id'] = org['_id']
    del org['_id']
    org['is_member'] = any(member['netid'] == netid for member in org['members'])
    org['is_admin'] = any(member['netid'] == netid and member['is_admin'] for member in org['members'])
    return jsonify(org)


@bp.route('/<ObjectId:org_id>/rename/<string:new_org_name>', methods=['PUT'])
@require_login
def rename_org(netid: str, client: ShrunkClient, org_id: ObjectId, new_org_name: str) -> Any:
    """`PUT /api/org/<org_id>/rename/<new_org_name>`

    Changes an organization's name if user is the admin of the org.

    :param org_id:
    :param new_org_name:
    """
    org = client.orgs.get_org(org_id)
    if org is None:
        abort(404)
    if (not client.orgs.is_member(org_id, netid)
        and not client.orgs.is_admin(org_id, netid)) or \
            not client.orgs.validate_name(new_org_name):
        abort(403)
    client.orgs.rename_org(org_id, new_org_name)
    return jsonify(org)


VALIDATE_NAME_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': ['name'],
    'properties': {
        'name': {'type': 'string'},
    },
}


@bp.route('/validate_name', methods=['POST'])
@request_schema(VALIDATE_NAME_SCHEMA)
@require_login
def validate_org_name(_netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/org/validate_name``

    Validate an organization name. This endpoint is used for form validation in the frontend. Request format:

    .. code-block:: json

       { "name": "string" }

    Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param req:
    """
    valid = client.orgs.validate_name(req['name'])
    response: Dict[str, Any] = {'valid': valid}
    if not valid:
        response['reason'] = 'That name is already taken.'
    return jsonify(response)


VALIDATE_NETID_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': ['netid'],
    'properties': {
        'netid': {'type': 'string'},
    },
}


@bp.route('/validate_netid', methods=['POST'])
@request_schema(VALIDATE_NETID_SCHEMA)
@require_login
def validate_netid(_netid: str, _client: ShrunkClient, req: Any) -> Any:
    """``POST /api/org/validate_netid``

    Check that a NetID is valid. This endpoint is used for form validation in the frontend. Request format:

    .. code-block:: json

       { "netid": "string" }

    Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param req:
    """
    valid = is_valid_netid(req['netid'])
    response: Dict[str, Any] = {'valid': valid}
    if not valid:
        response['reason'] = 'That NetID is not valid.'
    return jsonify(response)


@bp.route('/<ObjectId:org_id>/stats/visits', methods=['GET'])
@require_login
def get_org_visit_stats(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``GET /api/org/<org_id>/stats/visits``

    Get per-user visit statistics for an org. Response format:

    .. code-block:: json

       { "visits": [ {
         "netid": "string",
         "total_visits": "number",
         "unique_visits": "number"
         } ]
       }

    :param netid:
    :param client:
    :param org_id:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    visits = client.orgs.get_visit_stats(org_id)
    return jsonify({'visits': visits})


@bp.route('/<ObjectId:org_id>/stats/geoip', methods=['GET'])
@require_login
def get_org_geoip_stats(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``GET /api/org/<org_id>/stats/geoip``

    Get GeoIP statistics about all links belonging to members of the org. For response format,
    see :py:func:`~shrunk.api.link.get_link_geoip_stats`.

    :param netid:
    :param client:
    :param org_id:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    geoip = client.orgs.get_geoip_stats(org_id)
    return jsonify({'geoip': geoip})


@bp.route('/<ObjectId:org_id>/member/<member_netid>', methods=['PUT'])
@require_login
def put_org_member(netid: str, client: ShrunkClient, org_id: ObjectId, member_netid: str) -> Any:
    """``PUT /api/org/<org_id>/member/<netid>``

    Add a user to an org. Performs no action if the user is already a member of the org. Returns 204
    on success.

    :param netid:
    :param client:
    :param org_id:
    :param member_netid:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    client.orgs.create_member(org_id, member_netid)
    return '', 204


@bp.route('/<ObjectId:org_id>/member/<member_netid>', methods=['DELETE'])
@require_login
def delete_org_member(netid: str, client: ShrunkClient, org_id: ObjectId, member_netid: str) -> Any:
    """``DELETE /api/org/<org_id>/member/<netid>``

    Remove a member from an org. Returns 204 on success.

    :param netid:
    :param client:
    :param org_id:
    :param member_netid:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        if not netid == member_netid:
            abort(403)
    client.orgs.delete_member(org_id, member_netid)
    return '', 204


MODIFY_ORG_MEMBER_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'properties': {
        'is_admin': {'type': 'boolean'},
    },
}


@bp.route('/<ObjectId:org_id>/member/<member_netid>', methods=['PATCH'])
@request_schema(MODIFY_ORG_MEMBER_SCHEMA)
@require_login
def patch_org_member(netid: str, client: ShrunkClient, req: Any, org_id: ObjectId, member_netid: str) -> Any:
    """``PATCH /api/org/<org_id>/member/<netid>``

    Modify a member of an org. Returns 204 on success. Request response:

    .. code-block:: json

       { "is_admin?": "boolean" }

    Properties present in the request will be updated. Properties missing from the request will not be modified.

    :param netid:
    :param client:
    :param req:
    :param org_id:
    :param member_netid:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    if 'is_admin' in req:
        client.orgs.set_member_admin(org_id, member_netid, req['is_admin'])
    return '', 204
