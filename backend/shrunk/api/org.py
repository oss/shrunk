"""This module implements API endpoints under /org."""

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
    if req['which'] == 'all' and not client.roles.has('admin', netid):
        abort(403)
    orgs = client.orgs.get_orgs(netid, req['which'] == 'user')
    for org in orgs:
        org['id'] = str(org['id'])
        org['timeCreated'] = org['timeCreated'].isoformat()
        for member in org['members']:
            member['timeCreated'] = member['timeCreated'].isoformat()
    return jsonify({'orgs': orgs})


CREATE_ORG_SCHEMA = {
    'type': 'object',
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
    if not client.roles.has_some(['facstaff', 'admin'], netid):
        abort(403)
    org_id = client.orgs.create(req['name'])
    if org_id is None:
        abort(409)
    client.orgs.create_member(org_id, netid, is_admin=True)
    return jsonify({'id': str(org_id)})


@bp.route('/<ObjectId:org_id>', methods=['DELETE'])
@require_login
def delete_org(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    client.orgs.delete(org_id)
    return '', 204


@bp.route('/<ObjectId:org_id>', methods=['GET'])
@require_login
def get_org(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    if not client.orgs.is_member(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    org = client.orgs.get_org(org_id)
    if org is None:
        abort(404)
    org['id'] = str(org['_id'])
    del org['_id']
    org['timeCreated'] = org['timeCreated'].isoformat()
    for member in org['members']:
        member['timeCreated'] = member['timeCreated'].isoformat()
    org['is_member'] = any(member['netid'] == netid for member in org['members'])
    org['is_admin'] = any(member['netid'] == netid and member['is_admin'] for member in org['members'])
    return jsonify(org)


VALIDATE_NAME_SCHEMA = {
    'type': 'object',
    'required': ['name'],
    'properties': {
        'name': {'type': 'string'},
    },
}


@bp.route('/validate_name', methods=['POST'])
@request_schema(VALIDATE_NAME_SCHEMA)
@require_login
def validate_org_name(_netid: str, client: ShrunkClient, req: Any) -> Any:
    valid = client.orgs.validate_name(req['name'])
    response: Dict[str, Any] = {'valid': valid}
    if not valid:
        response['reason'] = 'That name is already taken.'
    return jsonify(response)


VALIDATE_NETID_SCHEMA = {
    'type': 'object',
    'required': ['netid'],
    'properties': {
        'netid': {'type': 'string'},
    },
}


@bp.route('/validate_netid', methods=['POST'])
@request_schema(VALIDATE_NETID_SCHEMA)
@require_login
def validate_netid(_netid: str, _client: ShrunkClient, req: Any) -> Any:
    valid = is_valid_netid(req['netid'])
    response: Dict[str, Any] = {'valid': valid}
    if not valid:
        response['reason'] = 'That NetID is not valid.'
    return jsonify(response)


@bp.route('/<ObjectId:org_id>/stats/visits', methods=['GET'])
@require_login
def get_org_visit_stats(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    visits = client.orgs.get_visit_stats(org_id)
    return jsonify({'visits': visits})


@bp.route('/<ObjectId:org_id>/stats/geoip', methods=['GET'])
@require_login
def get_org_geoip_stats(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    geoip = client.orgs.get_geoip_stats(org_id)
    return jsonify({'geoip': geoip})


@bp.route('/<ObjectId:org_id>/member/<member_netid>', methods=['PUT'])
@require_login
def put_org_member(netid: str, client: ShrunkClient, org_id: ObjectId, member_netid: str) -> Any:
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    client.orgs.create_member(org_id, member_netid)
    return '', 204


@bp.route('/<ObjectId:org_id>/member/<member_netid>', methods=['DELETE'])
@require_login
def delete_org_member(netid: str, client: ShrunkClient, org_id: ObjectId, member_netid: str) -> Any:
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    client.orgs.delete_member(org_id, member_netid)
    return '', 204


MODIFY_ORG_MEMBER_SCHEMA = {
    'type': 'object',
    'required': [],
    'properties': {
        'is_admin': {'type': 'boolean'},
    },
}


@bp.route('/<ObjectId:org_id>/member/<member_netid>', methods=['PATCH'])
@request_schema(MODIFY_ORG_MEMBER_SCHEMA)
@require_login
def patch_org_member(netid: str, client: ShrunkClient, req: Any, org_id: ObjectId, member_netid: str) -> Any:
    if not client.orgs.is_admin(org_id, netid) and not client.roles.has('admin', netid):
        abort(403)
    if 'is_admin' in req:
        client.orgs.set_member_admin(org_id, member_netid, req['is_admin'])
    return '', 204