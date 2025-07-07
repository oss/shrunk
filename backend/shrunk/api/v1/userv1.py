"""Implement API endpoints under ``/api/v1``"""

from typing import Any, Dict
import os

from flask import Blueprint, jsonify, request, session, current_app
from werkzeug.exceptions import abort
from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_token

__all__ = ["bp"]
bp = Blueprint("userv1", __name__, url_prefix="/api/v1/users")


@bp.route("", methods=["GET"])
@require_token(required_permisson="read:users")
def get_all_users(client: ShrunkClient) -> Dict[Any, Any]:
    """POST /api/v1/users

    Args:
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
    operations = []

    roles = request.args.get("roles")
    fields = request.args.get("fields")
    if roles:
        operations.append(
            {
                "field": "roles",
                "filterString": roles,
                "specification": "contains",
                "type": "filter",
            }
        )

    if fields:
        operations.append(
            {
                "field": fields,
                "filterString": "",
                "specification": "asc",
                "type": "sort",
            }
        )

    users = client.users.get_all_users(operations)
    if users is None:
        abort(404)
    return jsonify({"users": users})
