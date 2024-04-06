"""Implements API endpoints under ``/api/linkhub``"""

from typing import Any

from flask import Blueprint, jsonify

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login, request_schema

__all__ = ['bp']

bp = Blueprint('linkhub', __name__, url_prefix='/api/v1/linkhub')

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

CREATE_LINKHUB_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': ['title', 'alias', 'owners'],
    'properties': {
        'title': {'type': 'string', 'minLength': 1},
        'alias': {'type': 'string', 'minLength': 1},
        'owners': {'type': 'array', 'items': ACL_ENTRY_SCHEMA},
    },
}

@bp.route('/', methods=['POST'])
@request_schema(CREATE_LINKHUB_SCHEMA)
@require_login
def create_linkhub(netid: str, client: ShrunkClient, req: Any) -> Any:
    client.linkhubs.create(req['title'], req['alias'], req['owners'])
    return jsonify({})


GET_LINKHUB_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': ['alias'],
    'properties': {
        'alias': {'type': 'string', 'minLength': 1},
    },
}

@bp.route('/<string:alias>', methods=['GET'])
@request_schema(GET_LINKHUB_SCHEMA)
def get_linkhub(client: ShrunkClient, req: Any) -> Any:
    return jsonify(client.linkhubs.get(req['alias']))
