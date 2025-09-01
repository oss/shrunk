"""Implement API endpoints under ``/api/v1``"""

from typing import Any, Dict, Optional
from datetime import datetime

from flask import Blueprint, jsonify, request
from shrunk.client import ShrunkClient
from bson.objectid import ObjectId
import bson.errors
from shrunk.util.decorators import require_token, request_schema
from shrunk.client.exceptions import (
    BadAliasException,
    NoSuchObjectException,
    NotUserOrOrg,
    SecurityRiskDetected,
)

__all__ = ["bp"]
bp = Blueprint("trackingpixelv1", __name__, url_prefix="/api/v1/tracking-pixels")


CREATE_LINK_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "title": {"type": "string", "minLength": 1},
        "tracking_pixel_extension": {"type": "string", "enum": [".png", ".gif"]},
        "organization_id": {"type": "string", "minLength": 24},
    },
}


@bp.route("", methods=["POST"])
@request_schema(CREATE_LINK_SCHEMA)
@require_token(required_permission="create:tracking-pixels")
def create_tracking_pixel(
    token_owner: Dict[str, Any], client: ShrunkClient, req: Any
) -> Dict[Any, Any]:
    """Creates a new link"""

    org_id = req.get("organization_id")
    if org_id is not None:
        try:
            ObjectId(org_id)
        except bson.errors.InvalidId:
            return (
                jsonify(
                    {
                        "error": {
                            "code": "INVALID_ORG_ID_FORMAT",
                            "message": "Organization_id is not a valid ObjectId",
                            "details": "The provided organization_id is not a valid ObjectId",
                        }
                    }
                ),
                403,
            )

    if token_owner["type"] == "netid":

        if org_id is None:
            return (
                jsonify(
                    {
                        "error": {
                            "code": "MISSING_FIELD",
                            "message": "Missing required field: organization_id",
                            "details": "Provide organization_id in the request body.",
                        }
                    }
                ),
                400,
            )
    else:
        if org_id is None:
            org_id = token_owner["_id"]
        elif ObjectId(org_id) != token_owner["_id"]:
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

    if "tracking_pixel_extension" not in req:
        req["tracking_pixel_extension"] = ".png"

    if "expiration_time" in req:
        expiration_time: Optional[datetime] = datetime.fromisoformat(
            req["expiration_time"].replace("Z", "")
        )
    else:
        expiration_time = None

    alias = req.get("alias", None)
    owner = {"_id": ObjectId(org_id), "type": "org"}
    created_with_superToken = token_owner["type"] == "netid"
    try:
        link_id, created_alias = client.links.create(
            (
                "Untitled Link"
                if "title" not in req or req["title"] == ""
                else req["title"]
            ),
            "http://example.com",
            alias,
            expiration_time,
            owner,
            request.remote_addr,
            domain=False,
            editors=[],
            viewers=[],
            bypass_security_measures=False,
            is_tracking_pixel_link=True,
            extension=req["tracking_pixel_extension"],
            created_using_api=True,
            created_with_superToken=created_with_superToken,
        )

    except SecurityRiskDetected:
        return (
            jsonify(
                {
                    "error": {
                        "code": "SECURITY_RISK_DETECTED",
                        "message": "Link is detected as a potential security risk. Please contact system administration.",
                        "details": "The link provided has a security risk.",
                    }
                }
            ),
            403,
        )
    except NotUserOrOrg:
        return (
            jsonify(
                {
                    "error": {
                        "code": "INVALID_ORG_ID",
                        "message": "Invalid organization_id",
                        "details": "The provided organization_id does not correspond to a valid organization.",
                    }
                }
            ),
            400,
        )

    except BadAliasException:
        return (
            jsonify(
                {
                    "error": {
                        "code": "BAD_ALIAS",
                        "message": "Invalid or duplicate alias",
                        "details": "Alias already exists or contains invalid characters.",
                    }
                }
            ),
            400,
        )

    except NoSuchObjectException:
        return (
            jsonify(
                {
                    "error": {
                        "code": "BAD_OBJECT_EXCEPTION",
                        "message": "Bad object id",
                        "details": "A referenced object id was invalid or not found.",
                    }
                }
            ),
            400,
        )
    return jsonify({"id": str(link_id), "alias": created_alias}), 201


@bp.route("/<ObjectId:org_id>/<ObjectId:link_id>", methods=["GET"])
@require_token(required_permission="read:tracking-pixels")
def get_tracking_pixel(
    token_owner: Dict[str, Any],
    client: ShrunkClient,
    org_id: ObjectId,
    link_id: ObjectId,
) -> Any:
    """``GET /api/v1/link/<org_id>/<link_id>``

    Get information about a trackingpixel. Basically just returns the Mongo document.
    :param netid:
    :param client:
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
        info = client.links.get_link_info(link_id, is_tracking_pixel=True)
    except NoSuchObjectException:
        return (
            jsonify(
                {
                    "error": {
                        "code": "NO_SUCH_OBJECT",
                        "message": "Tracking pixel link not found",
                        "details": "This tracking pixel link does not exist or the ID is invalid.",
                    }
                }
            ),
            404,
        )

    if not client.links.get_owner(link_id)["_id"] == org_id:
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
        "owner": client.links.get_owner(link_id),
        "created_time": info["timeCreated"],
        "expiration_time": info.get("expiration_time", None),
        "domain": info.get("domain", None),
        "alias": info["alias"],
        "deleted": info.get("deleted", False),
        "deletion_info": {
            "deleted_by": info.get("deleted_by", None),
            "delete_time": info.get("deleted_time", None),
        },
        "editors": info["editors"] if "editors" in info else [],
        "viewers": info["viewers"] if "viewers" in info else [],
        "is_tracking_pixel_link": info.get("is_tracking_pixel_link", False),
    }

    return jsonify(json_info), 200


@bp.route("/<ObjectId:org_id>", methods=["GET"])
@require_token(required_permission="read:tracking-pixels")
def get_org_tracking_pixels(
    token_owner: Dict[str, Any], client: ShrunkClient, org_id: ObjectId
) -> Any:
    """``GET /api/v1/link/<org_id>``

    Get information about trackingpixels owned by a org. Basically just returns the Mongo document.
    :param netid:
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
        info = client.orgs.get_links(org_id, is_tracking_pixel=True)
    except NoSuchObjectException:
        return (
            jsonify(
                {
                    "error": {
                        "code": "NO_SUCH_OBJECT",
                        "message": "No tracking pixel links found for organization",
                        "details": "The organization does not contain any tracking pixel links or the id is invalid.",
                    }
                }
            ),
            404,
        )

    return jsonify({"links": list(info)}), 200
