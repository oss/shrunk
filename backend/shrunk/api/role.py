"""Implements API endpoints under ``/api/role``"""

from typing import Any, Dict

from flask import Blueprint, jsonify
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login, request_schema

__all__ = ['bp']

bp = Blueprint('role', __name__, url_prefix='/api/v1/role')


@bp.route('', methods=['GET'])
@require_login
def get_roles(netid: str, client: ShrunkClient) -> Any:
    """``GET /api/role``

    Get a list of all existing roles. Response format:

    .. code-block:: json

       { "roles": ["string"] }

    :param netid:
    :param client:
    """
    if not client.roles.has('admin', netid):
        abort(403)
    return jsonify({'roles': client.roles.get_role_names()})


@bp.route('/<role_name>/text', methods=['GET'])
@require_login
def get_role_text(netid: str, client: ShrunkClient, role_name: str) -> Any:
    """``GET /api/role/<role_name>/text``

    Get the role-text for a role. Response format:

    .. code-block:: json

       { "text": "role-text" }

    For the format of the role text, see :py:mod:`shrunk.client.roles`.

    :param netid:
    :param client:
    :param role_name:
    """
    if role_name != 'whitelisted' and not client.roles.has('admin', netid):
        abort(403)
    if role_name == 'whitelisted' and not client.roles.has_some(['admin', 'facstaff'], netid):
        abort(403)
    text = client.roles.get_role_text(role_name)
    return jsonify({'text': text})


@bp.route('/<role_name>/entity', methods=['GET'])
@require_login
def get_role_entities(netid: str, client: ShrunkClient, role_name: str) -> Any:
    """``GET /api/role/<role_name>/entity``

    Get a list of entities having the specified role. Response format:

    .. code-block:: json

       { "entities": [ {
           "entity": "string",
           "granted_by": "string",
           "comment": "comment"
         } ]
       }

    :param netid:
    :param client:
    :param role_name:
    """
    if role_name != 'whitelisted' and not client.roles.has('admin', netid):
        abort(403)
    if role_name == 'whitelisted' and not client.roles.has_some(['admin', 'facstaff'], netid):
        abort(403)
    entities = client.roles.get_role_entities(role_name)
    if role_name == 'whitelisted' and not client.roles.has('admin', netid):
        entities = [entity for entity in entities if entity['granted_by'] == netid]
    return jsonify({'entities':
                    [{'entity': entity['entity'],
                      'granted_by': entity['granted_by'],
                      'comment': entity.get('comment'),
                      'time_granted': entity['time_granted'].isoformat() if 'time_granted' in entity else None}
                     for entity in entities]})


@bp.route('/<role_name>/validate_entity/<b32:entity>', methods=['GET'])
@require_login
def validate_role_entity(netid: str, client: ShrunkClient, role_name: str, entity: str) -> Any:
    """``GET /api/role/<role_name>/validate_entity/<b32:entity>``

    Check whether an entity is valid for a given role. This endpoint is used for form validation
    in the frontend. Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param role_name:
    :param entity:
    """
    if role_name != 'whitelisted' and not client.roles.has('admin', netid):
        abort(403)
    if role_name == 'whitelisted' and not client.roles.has_some(['admin', 'facstaff'], netid):
        abort(403)
    valid = client.roles.is_valid_entity_for(role_name, entity)
    response: Dict[str, Any] = {'valid': valid}
    if not valid:
        response['reason'] = 'That entity is not valid for this role.'
    return jsonify(response)


PUT_ROLE_ENTITY_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'properties': {
        'comment': {'type': 'string'},
    },
}


@bp.route('/<role_name>/entity/<b32:entity>', methods=['PUT'])
@request_schema(PUT_ROLE_ENTITY_SCHEMA)
@require_login
def put_role_entity(netid: str, client: ShrunkClient, req: Any, role_name: str, entity: str) -> Any:
    """``PUT /api/role/<role_name>/entity/<b32:entity>``

    Add an entity to a role. If the entity is already present in the role, the operation has no
    effect. Returns 204 on success.

    :param netid:
    :param client:
    :param req:
    :param role_name:
    :param entity:
    """
    if role_name != 'whitelisted' and not client.roles.has('admin', netid):
        abort(403)
    if role_name == 'whitelisted' and not client.roles.has_some(['admin', 'facstaff'], netid):
        abort(403)
    client.roles.grant(role_name, netid, entity, comment=req.get('comment', ''))
    return '', 204


@bp.route('/<role_name>/entity/<b32:entity>', methods=['DELETE'])
@require_login
def delete_role_entity(netid: str, client: ShrunkClient, role_name: str, entity: str) -> Any:
    """``DELETE /api/role/<role_name>/entity/<b32:entity>``

    Remove an entity from a role. Returns 204 on success.

    :param netid:
    :param client:
    :param role_name:
    :param entity:
    """
    if role_name != 'whitelisted' and not client.roles.has('admin', netid):
        abort(403)
    if role_name == 'whitelisted' and not client.roles.has_some(['admin', 'facstaff'], netid):
        abort(403)
    client.roles.revoke(role_name, entity)
    return '', 204
