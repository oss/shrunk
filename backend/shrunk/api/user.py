"""Implement API endpoints under ``/api/user``"""

from typing import Any, Dict

from flask import Blueprint, jsonify, request, session, current_app
from werkzeug.exceptions import abort
from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login

__all__ = ["bp"]
bp = Blueprint("user", __name__, url_prefix="/api/v1/user")


@bp.route("", methods=["POST"])
@require_login
def get_all_users(netid: str, client: ShrunkClient) -> Dict[Any, Any]:
    """POST /api/v1/user

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object

    Obtains all users in the system.

    Request format:
    .. code-block:: json

    {
        "operations": [
            {
                "type": "str",
                "field": "str",
                "specification": "str",
                "filterString": "str",
            },
            ...
        ]
    }

    Response format:

    .. code-block:: json

        { "users": [{
                "netid": str,
                "organizations": [str, ...],
                "roles": [str, ...],
                "linksCreated": int,
            }, ...]
        }

    """
    if not client.roles.has("admin", netid):
        abort(403)

    data = request.get_json()
    operations = data.get("operations", [])
    print(operations)
    users = client.users.get_all_users(operations)
    if users is None:
        abort(404)
    return jsonify({"users": users})


@bp.route("/options", methods=["GET"])
@require_login
def get_user_system_options(netid: str, client: ShrunkClient) -> Dict[Any, Any]:
    """GET /api/v1/user/options

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object

    Obtains options related to the shrunk user system.

    Response format:

    """
    if not client.roles.has("admin", netid):
        abort(403)
    options = client.users.get_user_system_options()
    if options is None:
        abort(410)
    return jsonify({"options": options})


@bp.route("/info")
def get_user_info():
    """Get current user info from session"""
    if "user" not in session:
        return jsonify({"netid": "", "privileges": []})

    user = session["user"]
    client = current_app.client
    netid = user.get("netid", "")

    # Get user privileges
    privileges = []
    if client.roles.has("admin", netid):
        privileges.append("admin")
    if client.roles.has("facstaff", netid):
        privileges.append("facstaff")
    if client.roles.has("power_user", netid):
        privileges.append("power_user")
    if client.roles.has("whitelisted", netid):
        privileges.append("whitelisted")

    return jsonify({"netid": netid, "privileges": privileges})


@bp.route("/<b32:entity>/valid", methods=["GET"])
@require_login
def is_valid_entity(netid: str, client: ShrunkClient, entity: str) -> Any:
    """GET /api/v1/user/<b32:entity>/valid

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the entity to check

    Check whether an entity is a valid netid.

    Response format:

    .. code-block:: json

        { "valid": bool }

    """
    return jsonify({"valid": client.users.is_valid_entity(entity)})


@bp.route("/<b32:entity>/position", methods=["GET"])
@require_login
def get_position_info(netid: str, client: ShrunkClient, entity: str) -> Any:
    """GET /api/v1/user/<b32:entity>/position

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the entity to get position info for

    Get the position info for a user. Response format:

    .. code-block:: json

       {
            "titles": List[str],
            "departments": List[str],
            "employmentTypes": List[str]
        }
    """
    if not client.roles.has("admin", netid):
        abort(403)
    return jsonify(client.users.get_position_info(entity))
