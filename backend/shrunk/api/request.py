import codecs
from typing import Any

from flask import Blueprint, jsonify
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.client.exceptions import NoSuchObjectException
from shrunk.util.decorators import require_login

__all__ = ['bp']

bp = Blueprint('request', __name__, url_prefix='/api/v1/request')


@bp.route('/pending', methods=['GET'])
@require_login
def get_pending_requests(netid: str, client: ShrunkClient) -> Any:
    requests = client.links.get_pending_access_requests(netid)
    def jsonify_request(req: Any) -> Any:
        return {
            'link_id': str(req['_id']),
            'title': req['title'],
            'request_token': str(codecs.encode(req['request']['token'], encoding='hex'), 'utf8'),
            'requesting_netid': req['request']['requesting_netid'],
            'request_time': req['request']['created_at'].isoformat(),
        }
    return jsonify({'requests': [jsonify_request(req) for req in requests]})


@bp.route('/resolve/<hex_token:token>/accept')
@require_login
def accept_request(netid: str, client: ShrunkClient, token: bytes) -> Any:
    try:
        if not client.roles.has('admin', netid) and not client.links.check_access_request_permission(token, netid):
            abort(403)
    except NoSuchObjectException:
        abort(404)
    client.links.accept_access_request(token)
    return '', 204


@bp.route('/resolve/<hex_token:token>/deny')
@require_login
def deny_request(netid: str, client: ShrunkClient, token: bytes) -> Any:
    try:
        if not client.roles.has('admin', netid) and not client.links.check_access_request_permission(token, netid):
            abort(403)
    except NoSuchObjectException:
        abort(404)
    client.links.deny_access_request(token)
    return '', 204
