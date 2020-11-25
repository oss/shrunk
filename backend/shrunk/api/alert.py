"""Implements API endpoints under ``/api/alert``"""

from typing import Any

from flask import Blueprint, jsonify
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login

__all__ = ['bp']

bp = Blueprint('alert', __name__, url_prefix='/api/v1/alert')


@bp.route('/<request_netid>', methods=['GET'])
@require_login
def get_pending_alerts(netid: str, client: ShrunkClient, request_netid: str) -> Any:
    if netid != request_netid and not client.roles.has('admin', netid):
        abort(400)
    pending_alerts = client.alerts.get_pending_alerts(netid)
    return jsonify({'pending_alerts': pending_alerts})


@bp.route('/<request_netid>/<alert>', methods=['PUT'])
@require_login
def set_alert_viewed(netid: str, client: ShrunkClient, request_netid: str, alert: str) -> Any:
    if netid != request_netid and not client.roles.has('admin', netid):
        abort(400)
    client.alerts.set_alert_viewed(request_netid, alert)
    return '', 204
