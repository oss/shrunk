"""Implement API endpoints under ``/api/v1``"""

from typing import Any, Dict

from flask import Blueprint, jsonify
from bson.objectid import ObjectId
from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_token, request_schema
from shrunk.client.exceptions import (
    NoSuchObjectException,
)

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
def get_user_organizations(token_owner: Dict[str, Any], client: ShrunkClient, netid: str) -> Any:
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

    filtered_orgs = [{"orgId": org["id"], "name": org["name"], "role": org["role"]} for org in orgs]

    return jsonify({"organizations": filtered_orgs}), 200


@bp.route("/<ObjectId:org_id>/links/<ObjectId:link_id>", methods=["GET"])
@require_token(required_permission="read:links")
def get_org_link(token_owner: str, client: ShrunkClient, org_id: ObjectId, link_id: ObjectId) -> Any:
    """``GET /api/v1/organizations/<org_id>/links/<link_id>``

    Get information about an organization-owned link.
    :param token_owner:
    :param client:
    :param org_id:
    :param link_id:
    """

    if token_owner["type"] == "org":
        if org_id != token_owner["_id"]:
            return (
                jsonify(
                    {
                        "error": {
                            "code": "ORG_TOKEN_MISMATCH",
                            "message": "Organization mismatch",
                            "details": "The provided organization_id does not match the organization associated with your access token",
                        }
                    }
                ),
                403,
            )

    try:
        info = client.links.get_link_info(link_id, is_tracking_pixel=False)
    except NoSuchObjectException:
        return (
            jsonify(
                {
                    "error": {
                        "code": "NO_SUCH_OBJECT",
                        "message": "Link not found",
                        "details": "This link does not exist or the id is invalid.",
                    }
                }
            ),
            404,
        )

    owner = client.links.get_owner(link_id)
    if owner["_id"] != org_id:
        return (
            jsonify(
                {
                    "error": {
                        "code": "ORG_ISNT_OWNER",
                        "message": "Organization is not the owner",
                        "details": "The specified organization does not own this link or the id is invalid.",
                    }
                }
            ),
            403,
        )

    json_info = {
        "_id": info["_id"],
        "title": info["title"],
        "long_url": info["long_url"],
        "owner": owner,
        "created_time": info["timeCreated"],
        "expiration_time": info.get("expiration_time", None),
        "domain": info.get("domain", None),
        "alias": info["alias"],
        "deleted": info.get("deleted", False),
        "deletion_info": {
            "deleted_by": info.get("deleted_by", None),
            "delete_time": info.get("deleted_time", None),
        },
        "editors": info.get("editors", []),
        "viewers": info.get("viewers", []),
        "is_tracking_pixel_link": info.get("is_tracking_pixel_link", False),
    }

    return jsonify(json_info), 200


@bp.route("/<ObjectId:org_id>/links", methods=["GET"])
@require_token(required_permission="read:links")
def get_org_links(token_owner: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``GET /api/v1/organizations/<org_id>/links``

    Get information about links owned by an organization.
    :param token_owner:
    :param client:
    :param org_id:
    """
    if token_owner["type"] == "org":
        if org_id != token_owner["_id"]:
            return (
                jsonify(
                    {
                        "error": {
                            "code": "ORG_TOKEN_MISMATCH",
                            "message": "Organization mismatch",
                            "details": "The provided organization_id does not match the organization associated with your access token",
                        }
                    }
                ),
                403,
            )

    try:
        info = client.orgs.get_links(org_id, is_tracking_pixel=False)
        info = [
            {
                "_id": link["_id"],
                "title": link["title"],
                "long_url": link["long_url"],
                "owner": client.links.get_owner(link["_id"]),
                "created_time": link["timeCreated"],
                "expiration_time": link.get("expiration_time"),
                "domain": link.get("domain"),
                "alias": link["alias"],
                "deleted": link.get("deleted", False),
                "deletion_info": {
                    "deleted_by": link.get("deleted_by"),
                    "delete_time": link.get("deleted_time"),
                },
                "editors": link.get("editors", []),
                "viewers": link.get("viewers", []),
                "is_tracking_pixel_link": link.get("is_tracking_pixel_link", False),
            }
            for link in info
        ]

    except NoSuchObjectException:
        return (
            jsonify(
                {
                    "error": {
                        "code": "NO_SUCH_OBJECT",
                        "message": "No links found for organization",
                        "details": "The organization does not contain any links or the id is invalid.",
                    }
                }
            ),
            404,
        )

    return jsonify({"links": info}), 200


CREATE_ORGANIZATION_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["name", "owner_netid"],
    "properties": {
        "name": {"type": "string", "minLength": 1},
        "owner_netid": {"type": "string", "minLength": 1},
    },
}


@bp.route("", methods=["POST"])
@request_schema(CREATE_ORGANIZATION_SCHEMA)
@require_token(required_permission="create:organizations")
def create_organization(token_owner: Dict[str, Any], client: ShrunkClient, req: Any) -> Any:
    """``POST /api/v1/organizations``

    Create a new organization and add ``owner_netid`` as its admin.
    Requires a supertoken with ``create:organizations`` permission.
    :param token_owner:
    :param client:
    :param req:
    """
    requested_owner_netid = req.get("owner_netid")

    if token_owner["type"] != "netid":
        return (
            jsonify(
                {
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": "You do not have permission to create organizations",
                        "details": "This operation requires a Super Token",
                    }
                }
            ),
            403,
        )

    if not requested_owner_netid:
        return (
            jsonify(
                {
                    "error": {
                        "code": "MISSING_FIELD",
                        "message": "Missing required field: owner_netid",
                        "details": "Provide owner for creating organizations.",
                    }
                }
            ),
            400,
        )

    if "name" not in req:
        return (
            jsonify(
                {
                    "error": {
                        "code": "MISSING_FIELD",
                        "message": "Missing required field: name",
                        "details": "Provide name for creating organizations.",
                    }
                }
            ),
            400,
        )

    validEntity = client.users.is_valid_entity(requested_owner_netid)

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

    valid_role = client.users.has_role(requested_owner_netid, "admin") or client.users.has_role(
        requested_owner_netid, "facstaff"
    )

    if not valid_role:
        return (
            jsonify(
                {
                    "error": {
                        "code": "INVALID_ROLE",
                        "message": "Invalid role",
                        "details": "The provided netid does not have the required role",
                    }
                }
            ),
            403,
        )

    valid_name = client.orgs.validate_name(req["name"])
    if not valid_name:
        return (
            jsonify(
                {
                    "error": {
                        "code": "INVALID_NAME",
                        "message": "Invalid organization name",
                        "details": "The organization name is already in use",
                    }
                }
            ),
            409,
        )

    org_id = client.orgs.create(req["name"])

    if not org_id:
        return (
            jsonify(
                {
                    "error": {
                        "code": "ORG_CREATION_FAILED",
                        "message": "Failed to create organization",
                        "details": "The organization could not be created due to an internal error.",
                    }
                }
            ),
            500,
        )

    added_member = client.orgs.create_member(org_id, requested_owner_netid, "admin")

    if not added_member:
        return (
            jsonify(
                {
                    "error": {
                        "code": "MEMBER_CREATION_FAILED",
                        "message": "Failed to add member",
                        "details": "The member could not be added due to an internal error.",
                    }
                }
            ),
            500,
        )

    return jsonify({"organization": {"_id": org_id, "name": req["name"]}}), 201
