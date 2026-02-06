"""Implement API endpoints under ``/api/v1``"""

from typing import Any, Dict

from flask import Blueprint, jsonify, request
from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_token

__all__ = ["bp"]
bp = Blueprint("userv1", __name__, url_prefix="/api/v1/users")


@bp.route("", methods=["GET"])
@require_token(required_permission="read:users")
def get_all_users(token_owner: Dict[str, Any], client: ShrunkClient) -> Dict[Any, Any]:
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

    if token_owner["type"] != "netid":
        return (
            jsonify(
                {
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": "You do not have permission to view users",
                        "details": "This operation requires a Super Token",
                    }
                }
            ),
            403,
        )

    ALLOWED_QUERY_PARAMS = {"roles", "filter"}
    VALID_ROLES = {"admin", "facstaff", "power_user", "whitelisted"}
    VALID_FIELDS = {"netid", "organizations", "roles", "linksCreated"}

    query_params = request.args.keys()
    for param in query_params:
        if param not in ALLOWED_QUERY_PARAMS:
            return (
                jsonify(
                    {
                        "error": {
                            "code": "INVALID_QUERY_PARAMETER",
                            "message": "Invalid query parameter",
                            "details": f"Parameter '{param}' is not allowed. Valid parameters: {', '.join(ALLOWED_QUERY_PARAMS)}",
                        }
                    }
                ),
                400,
            )

    operations = []

    roles = request.args.get("roles")
    if roles == "":
        return (
            jsonify(
                {
                    "error": {
                        "code": "EMPTY_ROLES_PARAMETER",
                        "message": "Empty roles parameter",
                        "details": "The 'roles' parameter cannot be empty. Provide a valid role or omit the parameter.",
                    }
                }
            ),
            400,
        )
    if roles:
        requested_roles = roles.split(",")

        cleaned_roles = []
        for role in requested_roles:
            cleaned_role = role.strip()
            if cleaned_role in VALID_ROLES:
                cleaned_roles.append(cleaned_role)
            else:
                return (
                    jsonify(
                        {
                            "error": {
                                "code": "INVALID_ROLE",
                                "message": "Invalid role",
                                "details": f"Role '{cleaned_role}' is not valid. Valid roles: {', '.join(VALID_ROLES)}",
                            }
                        }
                    ),
                    400,
                )

        operations.append(
            {
                "field": "roles",
                "filterString": ",".join(cleaned_roles),
                "specification": "contains",
                "type": "filter",
            }
        )

    filter = request.args.get("filter")
    if filter == "":
        return (
            jsonify(
                {
                    "error": {
                        "code": "EMPTY_FILTER_PARAMETER",
                        "message": "Empty filter parameter",
                        "details": "The 'filter' parameter cannot be empty. Provide valid fields or omit the parameter.",
                    }
                }
            ),
            400,
        )

    users = client.users.get_all_users(operations)
    if users is None:
        return jsonify({"users": []}), 200

    if filter:
        requested_fields = filter.split(",")

        cleaned_fields = []
        for field in requested_fields:
            cleaned_field = field.strip()
            if cleaned_field in VALID_FIELDS:
                cleaned_fields.append(cleaned_field)
            else:
                return (
                    jsonify(
                        {
                            "error": {
                                "code": "INVALID_FIELD",
                                "message": "Invalid field",
                                "details": f"Field '{cleaned_field}' is not valid. Valid fields: {', '.join(VALID_FIELDS)}",
                            }
                        }
                    ),
                    400,
                )

        filtered_users = []
        for user in users:
            filtered_user = {}
            for field in cleaned_fields:
                if field in user:
                    filtered_user[field] = user[field]
            filtered_users.append(filtered_user)

        users = filtered_users

    return jsonify({"users": users}), 200
