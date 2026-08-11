"""Implement API endpoints under ``/api/v1``"""

from datetime import datetime
from io import BytesIO
from typing import Any, Dict, Optional

import bson.errors
import segno
from bson.objectid import ObjectId
from flask import Blueprint, Response, jsonify, request

from shrunk.client import ShrunkClient
from shrunk.client.exceptions import (
    BadAliasException,
    BadLongURLException,
    NoSuchObjectException,
    NotUserOrOrg,
    SecurityRiskDetected,
)
from shrunk.mongo_schema import MongoRef
from shrunk.util.decorators import request_schema, require_token
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
        "check_existing": {"type": "boolean"},
        "owner_netid": {"type": "string", "minLength": 1},
    },
}

UPDATE_LINK_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "minProperties": 1,
    "properties": {
        "deleted": {"type": "boolean"},
        "expiration_time": {"type": ["string", "null"], "format": "date-time"},
    },
}


@bp.route("", methods=["POST"])
@request_schema(CREATE_LINK_SCHEMA)
@require_token(required_permission="create:links")
def create_link(token_owner: MongoRef, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/v1/links``

    Create a new link owned by an organization or, for supertokens, by a NetID.
    Org tokens may omit ``organization_id`` to create under their token organization.
    Supertokens must provide either ``organization_id`` or ``owner_netid``.
    """

    org_id = req.get("organization_id")
    requested_owner_netid = req.get("owner_netid")

    if requested_owner_netid is not None and org_id is not None:
        return (
            jsonify(
                {
                    "error": {
                        "code": "CONFLICTING_FIELDS",
                        "message": "Conflicting fields: owner_netid and organization_id",
                        "details": "Provide either 'owner_netid' or 'organization_id', not both.",
                    }
                }
            ),
            400,
        )

    if requested_owner_netid is not None:
        if token_owner["type"] != "netid":
            return (
                jsonify(
                    {
                        "error": {
                            "code": "INSUFFICIENT_PERMISSIONS",
                            "message": "You do not have permission to create netid-owned links",
                            "details": "This operation requires a Super Token",
                        }
                    }
                ),
                403,
            )

        validEntity = client.users.is_valid_entity(requested_owner_netid)

        if not validEntity:
            return (
                jsonify(
                    {
                        "error": {
                            "code": "INVALID_OWNER_NETID",
                            "message": "The provided owner netid is not valid",
                            "details": "The netid must be a valid netid string.",
                        }
                    }
                ),
                400,
            )

        owner = {"_id": requested_owner_netid, "type": "netid"}

    else:
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
                    400,
                )

        if token_owner["type"] == "org":
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
        else:
            if org_id is None:
                return (
                    jsonify(
                        {
                            "error": {
                                "code": "MISSING_FIELD",
                                "message": "Missing required field: organization_id",
                                "details": "Provide organization_id for organization-owned links, or provide owner for netid-owned links.",
                            }
                        }
                    ),
                    400,
                )

        owner = {"_id": ObjectId(org_id), "type": "org"}

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
        expiration_time: Optional[datetime] = datetime.fromisoformat(req["expiration_time"].replace("Z", ""))
    else:
        expiration_time = None

    alias = req.get("alias", None)

    created_with_superToken = token_owner["type"] == "netid"

    if "check_existing" in req:
        if req["check_existing"]:
            try:
                link_id, created_alias = client.links.check_link_exists(req["long_url"], owner)
                return jsonify({"id": str(link_id), "alias": created_alias}), 201
            except NoSuchObjectException:
                pass
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

    try:
        link_id, created_alias = client.links.create(
            ("Untitled Link" if "title" not in req or req["title"] == "" else req["title"]),
            req["long_url"],
            alias,
            expiration_time,
            owner,
            request.remote_addr or "",
            domain="",
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

    base_url = request.url_root
    link = f"{base_url}" + created_alias

    return jsonify({"link": link, "id": str(link_id), "alias": created_alias}), 201


@bp.route("/<ObjectId:org_id>/<ObjectId:link_id>", methods=["GET"])
@require_token(required_permission="read:links")
def get_org_link(token_owner: MongoRef, client: ShrunkClient, org_id: ObjectId, link_id: ObjectId) -> Any:
    """``GET /api/v1/links/<org_id>/<link_id>``

    Legacy route for getting information about an organization-owned link.
    Prefer ``GET /api/v1/organizations/<org_id>/links/<link_id>`` for new clients.
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
        "editors": info.get("editors", []),
        "viewers": info.get("viewers", []),
        "is_tracking_pixel_link": info.get("is_tracking_pixel_link", False),
    }

    return jsonify(json_info), 200


@bp.route("/<ObjectId:link_id>", methods=["GET"])
@require_token(required_permission="read:links")
def get_link(token_owner: MongoRef, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/v1/links/<link_id>``

    Get information about any link by ID. Requires a supertoken.
    :param token_owner:
    :param client:
    :param link_id:
    """
    if token_owner["type"] != "netid":
        return (
            jsonify(
                {
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": "You do not have permission to view links",
                        "details": "This operation requires a Super Token",
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
        "editors": info.get("editors", []),
        "viewers": info.get("viewers", []),
        "is_tracking_pixel_link": info.get("is_tracking_pixel_link", False),
        "visits": info.get("visits", 0),
        "unique_visits": info.get("unique_visits", 0),
    }

    return jsonify(json_info), 200


@bp.route("/<ObjectId:org_id>/<ObjectId:link_id>/visits", methods=["POST"])
@require_token(required_permission="read:links")
def get_link_visits(token_owner: MongoRef, client: ShrunkClient, org_id: ObjectId, link_id: ObjectId) -> Any:
    """``POST /api/v1/links/<org_id>/<link_id>/visits``

    Get advanced information about visits to an organization-owned link.
    :param token_owner:
    :param client:
    :param org_id:
    :param link_id:

    ```query: {
        "mid": str | list[str] | None,
        "uid": str | list[str] | None,
    }
    ```
    """

    try:
        data = request.get_json()
    except Exception:
        data = {}

    if data is None:
        data = {}

    mid = data.get("mid", None)
    uid = data.get("uid", None)

    if token_owner["type"] == "org":
        if org_id != token_owner["_id"]:
            return (
                jsonify(
                    {
                        "error": {
                            "code": "LINK_TOKEN_MISMATCH",
                            "message": "Link mismatch",
                            "details": "The provided link_id does not match the link associated with your access token",
                        }
                    }
                ),
                403,
            )

    try:
        info = client.links.get_visits(link_id, mid=mid, uid=uid)
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

    return jsonify({"visits": list(info)}), 200


@bp.route("/<ObjectId:link_id>", methods=["PATCH"])
@request_schema(UPDATE_LINK_SCHEMA)
@require_token(required_permission="update:links")
def update_link(token_owner: Dict[str, Any], client: ShrunkClient, req: Any, link_id: ObjectId) -> Any:
    """``PATCH /api/v1/links/<link_id>``

    Update a link. Requires a supertoken.
    Accepted fields: deleted (bool), expiration_time (ISO string or null).
    :param token_owner:
    :param client:
    :param req:
    :param link_id:
    """
    if token_owner["type"] != "netid":
        return (
            jsonify(
                {
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": "You do not have permission to update links",
                        "details": "This operation requires a Super Token",
                    }
                }
            ),
            403,
        )

    try:
        client.links.get_link_info(link_id, is_tracking_pixel=False)
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

    try:
        if "deleted" in req:
            if req["deleted"] is False:
                client.links.restore(link_id)
            elif req["deleted"] is True:
                client.links.delete(link_id, deleted_by=str(token_owner["_id"]))

        if "expiration_time" in req:
            if req["expiration_time"] is None:
                client.links.remove_expiration_time(link_id)
            else:
                try:
                    parsed_expiration = datetime.fromisoformat(req["expiration_time"].replace("Z", ""))
                except ValueError:
                    return (
                        jsonify(
                            {
                                "error": {
                                    "code": "INVALID_EXPIRATION_TIME",
                                    "message": "Invalid expiration_time format",
                                    "details": "Provide a valid ISO 8601 datetime string.",
                                }
                            }
                        ),
                        400,
                    )
                client.links.modify(link_id, expiration_time=parsed_expiration)
    except NoSuchObjectException:
        return (
            jsonify(
                {
                    "error": {
                        "code": "NO_SUCH_OBJECT",
                        "message": "Link not found",
                        "details": "This link does not exist or has already been deleted.",
                    }
                }
            ),
            404,
        )
    except BadLongURLException, SecurityRiskDetected:
        return (
            jsonify(
                {
                    "error": {
                        "code": "INVALID_LONG_URL",
                        "message": "Invalid long_url",
                        "details": "The provided URL is blocked or flagged as a security risk.",
                    }
                }
            ),
            400,
        )

    return jsonify({"status": "updated"}), 200


@bp.route("/<ObjectId:link_id>/qrcode", methods=["GET"])
@require_token(required_permission="read:links")
def generate_qrcode(token_owner: MongoRef, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/v1/link/qrcode``

    Get qr codes from links owned by a org.
    :param netid:
    :param client:
    :param link_id:
    """

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

    if token_owner["type"] == "org":
        if not client.links.get_owner(link_id)["_id"] == token_owner["_id"]:
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
    base_url = request.url_root
    alias = info["alias"]
    link = f"{base_url}" + alias

    qr = segno.make(link)

    buf = BytesIO()
    qr.save(buf, kind="png", scale=10)
    buf.seek(0)

    return (
        Response(
            buf,
            mimetype="image/png",
            headers={"Content-Disposition": f"attachment; filename={alias}-qrcode.png"},
        ),
        200,
    )
