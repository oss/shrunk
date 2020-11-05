"""Implements API endpoints under ``/api/admin``"""

from typing import Any
from datetime import datetime

from flask import Blueprint, jsonify
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login, request_schema

__all__ = ['bp']

bp = Blueprint('admin', __name__, url_prefix='/api/v1/admin')


OVERVIEW_STATS_SCHEMA = {
    'type': 'object',
    'additionalProperties': False,
    'properties': {
        'range': {
            'type': 'object',
            'additionalProperties': False,
            'required': ['begin', 'end'],
            'properties': {
                'begin': {'type': 'string', 'format': 'date-time'},
                'end': {'type': 'string', 'format': 'date-time'},
            },
        },
    },
}


@bp.route('/stats/overview', methods=['POST'])
@request_schema(OVERVIEW_STATS_SCHEMA)
@require_login
def get_overview_stats(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/stats/overview``

    Returns some Shrunk-wide stats. Takes optional start end end times. Request format:

    .. code-block:: json

       { "range?": { "begin": "date-time", "end": "date-time" } }

    Response format:

    .. code-block:: json

       { "links": "number", "visits": "number", "users": "number" }

    :param netid:
    :param client:
    :param req:
    """
    if not client.roles.has('admin', netid):
        abort(403)
    if 'range' in req:
        begin = datetime.fromisoformat(req['range']['begin'])
        end = datetime.fromisoformat(req['range']['end'])
        stats = client.admin_stats(begin=begin, end=end)
    else:
        stats = client.admin_stats()
    return jsonify(stats)


@bp.route('/stats/endpoint', methods=['GET'])
@require_login
def get_endpoint_stats(netid: str, client: ShrunkClient) -> Any:
    """``GET /api/stats/endpoint``

    Returns visit statistics for each Flask endpoint. Response format:

    .. code-block:: json

       { "stats": [ { "endpoint": "string", "total_visits": "number", "unique_visits": "number" } ] }

    :param netid:
    :param client:
    """
    if not client.roles.has('admin', netid):
        abort(403)
    stats = client.endpoint_stats()
    return jsonify({'stats': stats})
