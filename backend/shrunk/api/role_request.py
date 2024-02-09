"""Implement API endpoints under ``/api/role_request``"""

from typing import Any

from flask import Blueprint, jsonify
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login


__all__ = ['role_request']
bp = Blueprint('role_request', __name__, url_prefix='/api/v1/role_request')

@bp.route('/<role>/pending', methods=['GET'])
@require_login
def get_pending_role_requests(netid: str, client: ShrunkClient, role: str) -> Any:
    pass

@bp.route('/<role>/<entity>/pending', methods=['GET'])
@require_login
def get_pending_role_request_for_entity(netid: str, client: ShrunkClient, entity: str, role: str) -> Any:
    pass

@bp.route('/<role>/<entity>/grant', methods=['POST'])
@require_login
def grant_role_request(netid: str, client: ShrunkClient, entity: str, role: str) -> Any:
    pass

@bp.route('/<role>/<entity>/deny', methods=['POST'])
@require_login
def deny_role_request(netid: str, client: ShrunkClient, entity: str, role: str) -> Any:
    pass
    