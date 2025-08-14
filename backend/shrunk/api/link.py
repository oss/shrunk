"""Implements API endpoints under ``/api/link``"""

from datetime import datetime
from typing import Any, Optional, Dict

from flask import Blueprint, jsonify, request
from flask_mailman import Mail
from bson import ObjectId
import bson
import os
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.client.exceptions import (
    BadAliasException,
    BadLongURLException,
    NoSuchObjectException,
    InvalidACL,
    NotUserOrOrg,
    SecurityRiskDetected,
    LinkIsPendingOrRejected,
)
from shrunk.util.stats import (
    get_human_readable_referer_domain,
    browser_stats_from_visits,
)
from shrunk.util.ldap import is_valid_netid
from shrunk.util.decorators import (
    require_login,
    require_mail,
    request_schema,
)

__all__ = ["bp"]

bp = Blueprint("link", __name__, url_prefix="/api/core/link")

MIN_ALIAS_LENGTH = 5

MAX_ALIAS_LENGTH = 60

ACL_ENTRY_SCHEMA = {
    "type": "object",
    "required": ["_id", "type"],
    "properties": {
        "_id": {"type": "string"},
        "type": {"type": "string", "enum": ["org", "netid"]},
    },
}

CREATE_LINK_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "title": {"type": "string", "minLength": 1},
        "long_url": {"type": "string", "minLength": 1},
        "alias": {"type": "string", "minLength": 5},
        "expiration_time": {"type": "string", "format": "date-time"},
        "is_tracking_pixel_link": {"type": "boolean"},
        "tracking_pixel_extension": {"type": "string", "enum": [".png", ".gif"]},
        "domain": {
            "type": "string",
            "minLength": 0,
        },  # TODO: Delete this by version 3.2, this is not a properly implemented feature.
        "editors": {
            "type": "array",
            "items": ACL_ENTRY_SCHEMA,
        },
        "viewers": {
            "type": "array",
            "items": ACL_ENTRY_SCHEMA,
        },
        "org_id": {
            "type": "string",
        },
    },
}

if int(os.getenv("SHRUNK_FLASK_TESTING")):
    CREATE_LINK_SCHEMA["properties"]["bypass_security_measures"] = {"type": "boolean"}


@bp.route("", methods=["POST"])
@request_schema(CREATE_LINK_SCHEMA)
@require_login
def create_link(netid: str, client: ShrunkClient, req: Any) -> Any:
    """Creates a new link."""

    if "editors" not in req:
        req["editors"] = []

    if "viewers" not in req:
        req["viewers"] = []

    if "domain" not in req:
        req["domain"] = ""

    if "bypass_security_measures" not in req:
        req["bypass_security_measures"] = False

    if "is_tracking_pixel_link" not in req:
        req["is_tracking_pixel_link"] = False
    elif "is_tracking_pixel_link" in req and "tracking_pixel_extension" not in req:
        req["tracking_pixel_extension"] = ".png"

    if not req["is_tracking_pixel_link"]:
        req["tracking_pixel_extension"] = ""

    if "long_url" not in req and req["is_tracking_pixel_link"]:
        req["long_url"] = "http://example.com"
    elif "long_url" not in req and not req["is_tracking_pixel_link"]:
        return "long_url is missing", 400

    if not client.roles.has("admin", netid) and req["bypass_security_measures"]:
        abort(403)

    if "expiration_time" in req:
        expiration_time: Optional[datetime] = datetime.fromisoformat(
            req["expiration_time"].replace("Z", "")
        )
    else:
        expiration_time = None

    owner = {}

    if "org_id" in req:
        try:
            req["org_id"] = ObjectId(req["org_id"])
            owner = {"_id": ObjectId(req["org_id"]), "type": "org"}
        except bson.errors.InvalidId:
            return "Invalid org id", 400

        if client.orgs.get_org(req["org_id"]) is None:
            return "No such org", 400
        if not client.orgs.is_member(ObjectId(req["org_id"]), netid):
            return "Not a member of the specified org", 403
    else:
         owner = {"_id": netid, "type": "netid"}
           
    
   

    alias = req.get("alias", None)

    if "alias" in req and not client.roles.has_some(["admin", "power_user"], netid):
        return "No permission to create a link with a custom alias", 403

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
            domain=req["domain"],
            editors=req["editors"],
            viewers=req["viewers"],
            bypass_security_measures=req["bypass_security_measures"],
            is_tracking_pixel_link=req["is_tracking_pixel_link"],
            extension=req["tracking_pixel_extension"],
        )

    except BadLongURLException:
        return "Bad long_url", 403

    except SecurityRiskDetected:
        return (
            "Link is detected as a potential security risk. Please contact system administration.",
            403,
        )

    except LinkIsPendingOrRejected:
        return (
            "Link is detected as a potential security risk. Please contact system administration.",
            403,
        )

    except NotUserOrOrg as e:
        return jsonify({"error": str(e)}), 400

    except BadAliasException:
        return "Bad alias", 400

    return jsonify({"id": str(link_id), "alias": created_alias}), 201


@bp.route("/validate_long_url/<b32:long_url>", methods=["GET"])
@require_login
def validate_long_url(_netid: str, client: ShrunkClient, long_url: str) -> Any:
    """``GET /api/validate_long_url/<b32:long_url>``

    Validate a long URL. This endpoint is used for form validation in the frontend. Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param long_url:
    """
    valid = not client.links.long_url_is_blocked(long_url)
    response: Dict[str, Any] = {"valid": valid}
    if not valid:
        response["reason"] = "That long URL is not allowed."
    return jsonify(response)


@bp.route("/<ObjectId:link_id>", methods=["GET"])
@require_login
def get_link(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>``

    Get information about a link. Basically just returns the Mongo document.

    :param netid:
    :param client:
    :param link_id:
    """
    try:
        info = client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)

    if info.get("deleted", False) and not client.roles.has("admin", netid):
        abort(404)

    if not client.roles.has("admin", netid) and not client.links.may_view(
        link_id, netid
    ):
        abort(403)

    # Get rid of types that cannot safely be passed to jsonify

    json_info = {
        "_id": info["_id"],
        "title": info["title"],
        "long_url": info["long_url"],
        "owner": client.links.get_owner(ObjectId(info["_id"])),
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
        "may_edit": client.links.may_edit(link_id, netid),
    }
    return jsonify(json_info), 200


MODIFY_LINK_SCHEMA = {
    "type": "object",
    "additionalProperties": True,
    "properties": {
        "title": {"type": "string", "minLength": 1},
        "long_url": {"type": "string", "format": "uri"},
        "expiration_time": {"type": ["string", "null"], "format": "date-time"},
        "created_time": {"type": ["string", "null"], "format": "date-time"},
    },
}


@bp.route("/<ObjectId:link_id>", methods=["PATCH"])
@request_schema(MODIFY_LINK_SCHEMA)
@require_login
def modify_link(netid: str, client: ShrunkClient, req: Any, link_id: ObjectId) -> Any:
    """``PATCH /api/link/<link_id>``

    Modify an existing link. Returns 204 on success or 403 on error. Request format:

    .. code-block:: json

       { "title?": "string", "long_url?": "string", "expiration_time?": "string | null" }

    Properties present in the request will be set. Properties missing from the request will not
    be modified. If ``"expiration_time"`` is present and set to ``null``, the effect is to remove
    the link's expiration time.

    :param netid:
    :param client:
    :param req:
    :param link_id:
    """
    if "expiration_time" in req and req["expiration_time"] is not None:
        req["expiration_time"] = datetime.fromisoformat(req["expiration_time"])
    try:
        link = client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)

    if not client.roles.has("admin", netid) and not client.links.may_edit(
        link_id, netid
    ):
        abort(403)
    if "owner" in req:

        if not client.links.is_owner(link_id, netid) and not client.roles.has(
            "admin", netid
        ):
            abort(403)
        if req["owner"]["type"] == "netid":
            if not is_valid_netid(req["owner"]["_id"]):
                abort(400)
        elif req["owner"]["type"] == "org":
            if not client.orgs.get_org(ObjectId(req["owner"]["_id"])):
                abort(400)
            if not client.orgs.is_member(
                ObjectId(req["owner"]["_id"]), netid
            ) and not client.roles.has("admin", netid):
                abort(403)

    try:
        client.links.modify(
            link_id,
            title=req.get("title"),
            long_url=req.get("long_url"),
            expiration_time=req.get("expiration_time"),
            owner=req.get("owner"),
        )
        if "expiration_time" in req and req["expiration_time"] is None:
            client.links.remove_expiration_time(link_id)
    except BadLongURLException:
        abort(400)
    except SecurityRiskDetected:
        return "Potential security risk. Please create a new link instead.", 403
    except LinkIsPendingOrRejected:
        return "Potential security risk. Please create a new link instead.", 403

    return "", 204


MODIFY_ACL_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["entry", "acl", "action"],
    "properties": {
        "entry": ACL_ENTRY_SCHEMA,
        "acl": {"type": "string", "enum": ["editors", "viewers"]},
        "action": {"type": "string", "enum": ["add", "remove"]},
    },
}


@bp.route("/<ObjectId:link_id>/acl", methods=["PATCH"])
@request_schema(MODIFY_ACL_SCHEMA)
@require_login
def modify_acl(netid: str, client: ShrunkClient, req: Any, link_id: ObjectId) -> Any:
    """``PATCH /api/link/<link_id>/acl``

    Modify an existing link's acl. Returns 204 on success or 403 on error.
    Request format:

    .. code-block:: json

       { "action": "add|remove", "entry": "<ACL_ENTRY>",
         "acl": "editors|viewers" }

    an ACL entry looks like. for orgs the id must be a valid bson ObjectId

    .. code-block:: json

       { "_id": "netid|org_id", "type": "org|netid" }

    :param netid:
    :param client:
    :param req:
    :param link_id:
    """
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has("admin", netid) and not client.links.may_edit(
        link_id, netid
    ):
        abort(403)
    try:
        if req["entry"]["type"] == "org":
            req["entry"]["_id"] = ObjectId(req["entry"]["_id"])
    except bson.errors.InvalidId as e:
        return (
            jsonify({"errors": ["org entry requires _id to be ObjectId: " + str(e)]}),
            400,
        )
    try:
        client.links.modify_acl(
            link_id, req["entry"], req["action"] == "add", req["acl"]
        )
    except InvalidACL:
        return jsonify({"errors": ["invalid acl"]})
    except NotUserOrOrg as e:
        return jsonify({"errors": ["not user or org: " + str(e)]}), 400
    return "", 204


@bp.route("/<ObjectId:link_id>", methods=["DELETE"])
@require_login
def delete_link(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``DELETE /api/<link_id>``

    Delete a link. Returns 204 on success and 403 on error.

    :param netid:
    :param client:
    :param link_id:
    """
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has("admin", netid) and not client.links.is_owner(
        link_id, netid
    ):
        abort(403)
    client.links.delete(link_id, netid)
    return "", 204


@bp.route("/<ObjectId:link_id>/clear_visits", methods=["POST"])
@require_login
def post_clear_visits(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``POST /link/<link_id>/clear_visits``

    Delete all visit data from a link. Returns 204 on success 4xx on error.

    :param netid:
    :param client:
    :param link_id:
    """
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has("admin", netid) and not client.links.is_owner(
        link_id, netid
    ):
        abort(403)
    client.links.clear_visits(link_id)
    return "", 204


@bp.route("/<ObjectId:link_id>/request_edit_access", methods=["POST"])
@require_mail
@require_login
def post_request_edit(
    netid: str, client: ShrunkClient, mail: Mail, link_id: ObjectId
) -> Any:
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has("admin", netid) and not client.links.may_view(
        link_id, netid
    ):
        abort(403)
    client.links.request_edit_access(mail, link_id, netid)
    return "", 204


@bp.route("/<ObjectId:link_id>/cancel_request_edit_access", methods=["POST"])
@require_mail
@require_login
def cancel_request_edit(
    netid: str, client: ShrunkClient, mail: Mail, link_id: ObjectId
) -> Any:
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has("admin", netid) and not client.links.may_view(
        link_id, netid
    ):
        abort(403)
    client.links.cancel_request_edit_access(mail, link_id, netid)
    return "", 204


@bp.route("/<ObjectId:link_id>/active_request_exists", methods=["GET"])
@require_mail
@require_login
def request_exists(
    netid: str, client: ShrunkClient, mail: Mail, link_id: ObjectId
) -> bool:
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.roles.has("admin", netid) and not client.links.may_view(
        link_id, netid
    ):
        abort(403)
    exists = client.links.active_request_exists(mail, link_id, netid)
    return jsonify(exists)


def anonymize_visit(client: ShrunkClient, visit: Any) -> Any:
    """Anonymize a visit by replacing its source IP with an opaque visitor ID.

    :param client:
    :param visit:
    """
    return {
        "link_id": visit["link_id"],
        "alias": visit["alias"],
        "visitor_id": client.links.get_visitor_id(visit["source_ip"]),
        "user_agent": visit.get("user_agent", "Unknown"),
        "referer": get_human_readable_referer_domain(visit),
        "state_code": (
            visit.get("state_code", "Unknown")
            if visit.get("country_code") == "US"
            else "Unknown"
        ),
        "country_code": visit.get("country_code", "Unknown"),
        "time": visit["time"],
    }


@bp.route("/<ObjectId:link_id>/visits", methods=["GET"])
@require_login
def get_link_visits(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>/visits``

    Get anonymized visit data associated with a link. Response format:

    .. code-block:: json

       { "visits": [ {
           "link_id": "string",
           "alias": "string",
           "visitor_id": "string",
           "user_agent": "string",
           "referer": "string",
           "state_code": "string",
           "country_code": "string",
           "time": "date-time"
       } ] }

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.roles.has("admin", netid) and not client.links.may_view(
        link_id, netid
    ):

        abort(403)
    visits = client.links.get_visits(link_id)
    anonymized_visits = [anonymize_visit(client, visit) for visit in visits]
    return jsonify({"visits": anonymized_visits})


@bp.route("/<ObjectId:link_id>/stats", methods=["GET"])
@require_login
def get_link_overall_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>/stats``

    Get overall stats associated with a link. Response format:

    .. code-block:: json

       { "total_visits": "number", "unique_visits": "number" }

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.roles.has("admin", netid) and not client.links.may_view(
        link_id, netid
    ):
        abort(403)
    stats = client.links.get_overall_visits(link_id)
    return jsonify(stats)


@bp.route("/<ObjectId:link_id>/stats/visits", methods=["GET"])
@require_login
def get_link_visit_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>/stats/visits``

    Get daily visits information associated with a link. Response format:

    .. code-block:: json

       { "visits": [ {
           "_id": { "year": "number", "month": "number", "day": "number" },
           "all_visits": "number",
           "first_time_visits": "number"
       } ] }

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.roles.has("admin", netid) and not client.links.may_view(
        link_id, netid
    ):
        abort(403)
    visits = client.links.get_daily_visits(link_id)
    return jsonify({"visits": visits})


@bp.route("/<ObjectId:link_id>/stats/geoip", methods=["GET"])
@require_login
def get_link_geoip_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>/stats/geoip``

    Get GeoIP stats associated with a link. Response format:

    .. code-block:: json

       {
         "us": [ { "code": "string", "value": "number" } ],
         "world": [ { "code": "string", "value": "number" } ]
       }

    where the value of ``"code"`` is an ISO country or subdivison code and the value of ``"value"`` is the
    number of visits in that geographic region.

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.roles.has("admin", netid) and not client.links.may_view(
        link_id, netid
    ):
        abort(403)
    geoip = client.links.get_geoip_stats(link_id)
    return jsonify(geoip)


@bp.route("/<ObjectId:link_id>/stats/browser", methods=["GET"])
@require_login
def get_link_browser_stats(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``GET /api/link/<link_id>/stats/browser``

    Get stats about browsers and referers of visitors. Response format:

    .. code-block:: json

       {
         "browsers": [ { "name": "string", "y": "number" } ],
         "platforms": [ { "name": "string", "y": "number" } ],
         "referers": [ { "name": "string", "y": "number" } ]
       }

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.roles.has("admin", netid) and not client.links.may_view(
        link_id, netid
    ):
        abort(403)
    visits = client.links.get_visits(link_id)
    stats = browser_stats_from_visits(visits)
    return jsonify(stats)


@bp.route("/validate_reserved_alias/<b32:alias>", methods=["GET"])
@require_login
def validate_reserved_alias(_netid: str, client: ShrunkClient, alias: str) -> Any:
    """``GET /api/validate_reserved_alias/<b32:alias>``

    Validate an alias. This endpoint is used for form validation in the frontend. Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param alias:
    """
    valid = not client.links.alias_is_reserved(alias)
    response: Dict[str, Any] = {"valid": valid}

    if not valid:
        response["reason"] = "That alias cannot be used."
    return jsonify(response)


@bp.route("/validate_duplicate_alias/<b32:alias>", methods=["GET"])
@require_login
def validate_duplicate_alias(_netid: str, client: ShrunkClient, alias: str) -> Any:
    """``GET /api/validate_duplicate_alias/<b32:alias>``

    Validate an alias. This endpoint is used for form validation in the frontend. Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param alias:
    """
    valid = not client.links.alias_is_duplicate(alias, False)
    response: Dict[str, Any] = {"valid": valid}

    if not valid:
        response["reason"] = "That alias already exists."
    return jsonify(response)


@bp.route("/<ObjectId:link_id>/revert", methods=["POST"])
@require_login
def revert_link(netid: str, client: ShrunkClient, link_id: ObjectId) -> Any:
    """``POST /api/link/<link_id>/revert``

    Revert an expired link such that it has no expiration date. Returns 204 on success or 403 on error. Request format:

    .. code-block:: json

    :param netid:
    :param client:
    :param link_id:
    """
    try:
        info = client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)

    if not client.roles.has("admin", netid) and not client.links.may_edit(
        link_id, netid
    ):
        abort(403)

    alias = info["alias"]
    if client.links.alias_is_reserved(alias) and client.links.alias_is_duplicate(alias):
        abort(400)

    try:
        client.links.remove_expiration_time(link_id)

    except NoSuchObjectException:
        abort(404)
    return "", 204
