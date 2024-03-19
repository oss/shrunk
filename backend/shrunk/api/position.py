"""Implement API endpoints under ``/api/position``"""

from typing import Any

from flask import Blueprint, jsonify
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login


__all__ = ["bp"]
bp = Blueprint("position", __name__, url_prefix="/api/v1/position")


@bp.route("/<b32:entity>", methods=["GET"])
@require_login
def get_position_info(netid: str, client: ShrunkClient, entity: str) -> Any:
    """``GET /api/position/<b32:entity>``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the netid of the user to get position info for

    Get the position info for a user. Response format:

    .. code-block:: json

       {
           "uid": List[str],
           "rutgersEduStaffDepartment": List[str],
           "title": List[str],
           "employeeType": List[str],
       }
    """
    if not client.roles.has("admin", netid):
        abort(403)
    return jsonify(client.positions.get_position_info(entity))
