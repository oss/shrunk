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
    'properties': {
        'range': {
            'type': 'object',
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
    if not client.roles.has('admin', netid):
        abort(403)
    stats = client.endpoint_stats()
    return jsonify({'stats': stats})
