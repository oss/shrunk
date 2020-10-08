"""This module implements API endpoints under /search."""

from typing import Any

from flask import Blueprint, jsonify
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login, request_schema

__all__ = ['bp']

bp = Blueprint('search', __name__, url_prefix='/api/v1/search')

SEARCH_SCHEMA = {
    'type': 'object',
    'required': ['set', 'show_expired_links', 'sort'],
    'properties': {
        # The search query. May be omitted to show all links.
        'query': {'type': 'string'},

        # Within which "set" to search. Required. Valid configurations include:
        #  * links owned by the user (set.set == 'user')
        #  * all links (set.set == 'all')
        #  * links belonging to a particular group (set.set == 'group' and set.group is set)
        'set': {
            'oneOf': [
                {
                    'type': 'object',
                    'properties': {
                        'set': {
                            'type': 'string',
                            'enum': ['user', 'all'],
                        },
                    },
                    'required': ['set'],
                },
                {
                    'type': 'object',
                    'properties': {
                        'set': {
                            'type': 'string',
                            'enum': ['org'],
                        },
                        'org': {'type': 'string'},
                    },
                    'required': ['set', 'org'],
                },
            ],
        },

        # Whether to show expired links. Required.
        'show_expired_links': {'type': 'boolean'},

        # Sorting parameters. Required.
        #  * sort.key may be one of 'created_time', 'title', or 'visits'.
        #  * sort.order may be one of 'ascending' or 'descending'.
        'sort': {
            'type': 'object',
            'properties': {
                'key': {
                    'type': 'string',
                    'enum': ['created_time', 'title', 'visits'],
                },
                'order': {
                    'type': 'string',
                    'enum': ['ascending', 'descending'],
                },
            },
            'required': ['key', 'order'],
        },

        # Pagination parameters. May be omitted to return all links.
        'pagination': {
            'type': 'object',
            'properties': {
                'skip': {'type': 'integer', 'minimum': 0},
                'limit': {'type': 'integer', 'minimum': 1},
            },
            'required': ['skip', 'limit'],
        },
    },
}


@bp.route('', methods=['POST'])
@request_schema(SEARCH_SCHEMA)
@require_login
def post_search(netid: str, client: ShrunkClient, req: Any) -> Any:
    """Execute a search query."""
    is_admin = client.roles.has('admin', netid)

    # Must be admin to view all links.
    if req['set']['set'] == 'all' and not is_admin:
        abort(403)

    # Must be admin to view deleted links.
    if req.get('show_deleted_links', False) and not is_admin:
        abort(403)

    # Must be admin or member of organization to view its links.
    if req['set']['set'] == 'org' and not (is_admin or client.orgs.is_member(req['set']['org'], netid)):
        abort(403)

    result = client.search.execute(netid, req)
    return jsonify(result)
