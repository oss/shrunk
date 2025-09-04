"""Implement API endpoints under ``/api/v1``"""

from typing import Any, Dict

from flask import Blueprint, jsonify
from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_token

__all__ = ["bp"]
bp = Blueprint("orgv1", __name__, url_prefix="/api/v1/organizations")


@bp.route("", methods=["GET"])
@require_token(required_permission="read:organizations")
def get_all_organizations(token_owner: Dict[str, Any], client: ShrunkClient) -> Any:
    """``GET /api/v1/organizations``

    Get information about all organizations. Basically just returns the Mongo document.
    :param client:
    """

    if token_owner["type"] != "netid":
        return (
            jsonify(
                {
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": "You do not have permission to view all organizations",
                        "details": "This operation requires a Super Token",
                    }
                }
            ),
            403,
        )

    orgs = client.orgs.get_orgs("", False)

    filtered_orgs = [
        {
            "orgId": org["id"],
            "name": org["name"],
            "members": [m["netid"] for m in org["members"]],
        }
        for org in orgs
    ]

    return jsonify({"organizations": filtered_orgs}), 200


@bp.route("/<netid>", methods=["GET"])
@require_token(required_permission="read:organizations")
def get_user_organizations(
    token_owner: Dict[str, Any], client: ShrunkClient, netid: str
) -> Any:
    """``GET /api/v1/organizations/<netid>``

    Get information about all organizations a user is a member of. Basically just returns the Mongo document.
    :param client:
    :param netid:
    """

    if token_owner["type"] != "netid":
        return (
            jsonify(
                {
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": "You do not have permission to view this users organizations",
                        "details": "This operation requires a Super Token",
                    }
                }
            ),
            403,
        )

    validEntity = client.users.is_valid_entity(netid)

    if not validEntity:
        return (
            jsonify(
                {
                    "error": {
                        "code": "INVALID_NETID",
                        "message": "Invalid netid",
                        "details": "The provided netid does not exist",
                    }
                }
            ),
            400,
        )

    orgs = client.orgs.get_orgs(netid, True)

    filtered_orgs = [{"orgId": org["id"], "name": org["name"]} for org in orgs]

    return jsonify({"organizations": filtered_orgs}), 200
