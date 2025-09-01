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
    BadLongURLException,
    NoSuchObjectException,
    NotUserOrOrg,
    SecurityRiskDetected,
)

from shrunk.util.string import validate_url


__all__ = ["bp"]
bp = Blueprint("linkv1", __name__, url_prefix="/api/v1/links")


CREATE_LINK_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "title": {"type": "string", "minLength": 1},
        "long_url": {"type": "string", "minLength": 1},
        "alias": {"type": "string", "minLength": 5},
        "expiration_time": {"type": "string", "format": "date-time"},
        "organization_id": {"type": "string", "minLength": 24},
    },
}


@bp.route("", methods=["POST"])
@request_schema(CREATE_LINK_SCHEMA)
@require_token(required_permission="create:links")
def create_link(
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

    if "long_url" not in req:
        return (
            jsonify(
                {
                    "error": {
                        "code": "MISSING_FIELD",
                        "message": "Missing required field: long_url",
                        "details": "Provide long_url for non-tracking links.",
                    }
                }
            ),
            400,
        )

    if not validate_url(req["long_url"]):
        return (
            jsonify(
                {
                    "error": {
                        "code": "BAD_LONG_URL",
                        "message": "Invalid long_url",
                        "details": "The provided URL is not valid.",
                    }
                }
            ),
            400,
        )

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
            req["long_url"],
            alias,
            expiration_time,
            owner,
            request.remote_addr,
            domain=False,
            editors=[],
            viewers=[],
            bypass_security_measures=False,
            is_tracking_pixel_link=False,
            extension=None,
            created_using_api=True,
            created_with_superToken=created_with_superToken,
        )

    except BadLongURLException:
        return (
            jsonify(
                {
                    "error": {
                        "code": "BAD_LONG_URL",
                        "message": "Invalid long_url",
                        "details": "The provided URL is not valid.",
                    }
                }
            ),
            400,
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
@require_token(required_permission="read:links")
def get_link(
    token_owner: str, client: ShrunkClient, org_id: ObjectId, link_id: ObjectId
) -> Any:
    """``GET /api/v1/link/<org_id>/<link_id>``

    Get information about a link. Basically just returns the Mongo document.
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
@require_token(required_permission="read:links")
def get_org_links(token_owner: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``GET /api/v1/link/<org_id>``

    Get information about links owned by a org. Basically just returns the Mongo document.
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
        info = client.orgs.get_links(org_id, is_tracking_pixel=False)
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

    return jsonify({"links": list(info)}), 200
