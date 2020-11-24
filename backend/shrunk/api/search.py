"""Implements endpoints under ``/api/search``"""

from datetime import datetime
from typing import Any

from flask import Blueprint, jsonify
from werkzeug.exceptions import abort
from bson import ObjectId
import bson.errors

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login, request_schema

__all__ = ['bp']

bp = Blueprint('search', __name__, url_prefix='/api/v1/search')

SEARCH_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'required': ['set', 'show_expired_links', 'show_deleted_links', 'sort'],
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
                    'additionalProperties': False,
                    'required': ['set'],
                    'properties': {
                        'set': {
                            'type': 'string',
                            'enum': ['user', 'shared', 'all'],
                        },
                    },
                },
                {
                    'type': 'object',
                    'additionalProperties': False,
                    'required': ['set', 'org'],
                    'properties': {
                        'set': {
                            'type': 'string',
                            'enum': ['org'],
                        },
                        'org': {'type': 'string'},
                    },
                },
            ],
        },

        # Whether to show expired links. Required.
        'show_expired_links': {'type': 'boolean'},

        # Whether to show deleted links. Required.
        'show_deleted_links': {'type': 'boolean'},

        # Sorting parameters. Required.
        #  * sort.key may be one of 'created_time', 'title', or 'visits'.
        #  * sort.order may be one of 'ascending' or 'descending'.
        'sort': {
            'type': 'object',
            'additionalProperties': False,
            'required': ['key', 'order'],
            'properties': {
                'key': {
                    'type': 'string',
                    'enum': ['created_time', 'title', 'visits', 'relevance'],
                },
                'order': {
                    'type': 'string',
                    'enum': ['ascending', 'descending'],
                },
            },
        },

        # Pagination parameters. May be omitted to return all links.
        'pagination': {
            'type': 'object',
            'additionalProperties': False,
            'required': ['skip', 'limit'],
            'properties': {
                'skip': {'type': 'integer', 'minimum': 0},
                'limit': {'type': 'integer', 'minimum': 1},
            },
        },

        'begin_time': {
            'type': 'string',
            'format': 'date-time',
        },

        'end_time': {
            'type': 'string',
            'format': 'date-time',
        },
    },
}


@bp.route('', methods=['POST'])
@request_schema(SEARCH_SCHEMA)
@require_login
def post_search(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/search``

    Execute a search query. Request format:

    .. code-block:: json

       {
         "query?": "string",
         "set": {
           "set": "'user' | 'shared' | 'all' | 'org'",
           "org?": "string"
         },
         "show_expired_links": "boolean",
         "show_deleted_links": "boolean",
         "sort": {
           "key": "'created_time' | 'title' | 'visits' | 'relevance'",
           "order": "'ascending' | 'descending'"
         },
         "pagination?": {
           "skip": "number",
           "limit": "number"
         },
         "begin_time?": "date-time",
         "end_time?": "date-time"
       }

    Response format:

    .. code-block:: json

       {
          "count": "number",
          "results": [ {
            "id": "string",
            "title": "string",
            "long_url": "string",
            "created_time": "date-time",
            "expiration_time": "date-time | null",
            "visits": "number",
            "unique_visits": "number",
            "owner": "string",
            "aliases": [ { "alias": "string", "deleted": "boolean" } ],
            "is_expired": "boolean",
            "deletion_info?": {
              "deleted_by": "string",
              "deleted_time": "date-time"
            }
          } ]
       }

    :param netid:
    :param client:
    :param req:
    """
    is_admin = client.roles.has('admin', netid)

    # Must be admin to view all links.
    if req['set']['set'] == 'all' and not is_admin:
        abort(403)

    # Must be admin to view deleted links.
    if req.get('show_deleted_links', False) and not is_admin:
        abort(403)

    # Must be admin or member of organization to view its links.
    if req['set']['set'] == 'org':
        try:
            req['set']['org'] = ObjectId(req['set']['org'])
        except bson.errors.InvalidId:
            abort(400)
        if not is_admin and not client.orgs.is_member(req['set']['org'], netid):
            abort(403)

    if 'begin_time' in req:
        req['begin_time'] = datetime.fromisoformat(req['begin_time'])

    if 'end_time' in req:
        req['end_time'] = datetime.fromisoformat(req['end_time'])

    result = client.search.execute(netid, req)
    return jsonify(result)
