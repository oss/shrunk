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
    """GET /api/v1/users

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
    ALLOWED_QUERY_PARAMS = {"roles", "filter"}
    VALID_FIELDS = {"netid", "organizations", "roles", "linksCreated"}

    query_params = request.args.keys()
    for param in query_params:
        if param not in ALLOWED_QUERY_PARAMS:
            return jsonify({"error": "Invalid query parameter"}), 400

    operations = []

    roles = request.args.get("roles")
    if roles == "":
        return jsonify({"error": "Empty roles parameter"}), 400
    if roles:
        operations.append(
            {
                "field": "roles",
                "filterString": roles,
                "specification": "contains",
                "type": "filter",
            }
        )

    filter = request.args.get("filter")
    if filter == "":
        return jsonify({"error": "Empty filter parameter"}), 400

    users = client.users.get_all_users(operations)
    if users is None:
        abort(404)

    if filter:
        requested_fields = filter.split(",")

        cleaned_fields = []
        for field in requested_fields:
            cleaned_field = field.strip()
            if cleaned_field in VALID_FIELDS:
                cleaned_fields.append(cleaned_field)
            else:
                return jsonify({"error": "Invalid field"}), 400

        filtered_users = []
        for user in users:
            filtered_user = {}
            for field in cleaned_fields:
                if field in user:
                    filtered_user[field] = user[field]
            filtered_users.append(filtered_user)

        users = filtered_users

    return jsonify({"users": users})
