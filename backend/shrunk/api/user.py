"""Implement API endpoints under ``/api/user``"""

from typing import Any, Dict

from flask import Blueprint, jsonify, request
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
