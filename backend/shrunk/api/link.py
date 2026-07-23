"""Implements API endpoints under ``/api/link``"""

from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List, Mapping, Sequence

import os
import csv
from io import StringIO

from flask import Blueprint, jsonify, request, Response
from flask_mailman import Mail
from bson import ObjectId
import bson
import bson.errors
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.mongo_schema import MongoRef
from shrunk.client.exceptions import (
    BadAliasException,
    BadLongURLException,
    NoSuchObjectException,
    InvalidACL,
    NotUserOrOrg,
    OrgOwnedLinkNotSupported,
    SecurityRiskDetected,
    LinkIsPendingOrRejected,
    BulkLinkValidationError,
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

if int(os.getenv("SHRUNK_FLASK_TESTING", "0")):
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

    if not client.users.has_role(netid, "admin") and req["bypass_security_measures"]:
        abort(403)

    if "expiration_time" in req:
        expiration_time: Optional[datetime] = datetime.fromisoformat(req["expiration_time"].replace("Z", ""))
    else:
        expiration_time = None

    owner: MongoRef = {"_id": netid, "type": "netid"}

    if client.users.has_role(netid, "guest"):  # force org link ownership for guest
        org = client.orgs.get_orgs(netid, True)[0]
        req["org_id"] = str(org["id"])

    if "org_id" in req:
        try:
            req["org_id"] = ObjectId(req["org_id"])
            owner = {"_id": ObjectId(req["org_id"]), "type": "org"}
        except bson.errors.InvalidId:
            return "Invalid org id", 400

        if client.orgs.get_org(req["org_id"]) is None:
            return "No such org", 400
        if not client.orgs.is_member(req["org_id"], netid):
            return "Not a member of the specified org", 403

    alias = req.get("alias", None)

    if "alias" in req and not client.users.has_role(netid, "admin") and not client.users.has_role(netid, "power_user"):
        return "No permission to create a link with a custom alias", 403

    try:
        link_id, created_alias = client.links.create(
            ("Untitled Link" if "title" not in req or req["title"] == "" else req["title"]),
            req["long_url"],
            alias,
            expiration_time,
            owner,
            request.remote_addr or "",
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

    if info.get("deleted", False) and not client.users.has_role(netid, "admin"):
        abort(404)

    if not client.users.has_role(netid, "admin") and not client.links.may_view(link_id, netid):
        abort(403)

    def enrich_acl_with_org_names(entries: Sequence[Mapping[str, Any]]) -> List[Dict[str, Any]]:
        enriched_entries: List[Dict[str, Any]] = []
        org_name_cache: Dict[str, Optional[str]] = {}

        for entry in entries:
            enriched_entry = dict(entry)
            if enriched_entry.get("type") == "org":
                org_id = enriched_entry.get("_id")
                normalized_org_id: Optional[ObjectId] = None

                if isinstance(org_id, ObjectId):
                    normalized_org_id = org_id
                elif isinstance(org_id, str):
                    try:
                        normalized_org_id = ObjectId(org_id)
                    except bson.errors.InvalidId, TypeError:
                        normalized_org_id = None

                if normalized_org_id is not None:
                    cache_key = str(normalized_org_id)
                    if cache_key not in org_name_cache:
                        org = client.orgs.get_org(normalized_org_id)
                        org_name_cache[cache_key] = org["name"] if org is not None else None

                    if org_name_cache[cache_key] is not None:
                        enriched_entry["org_name"] = org_name_cache[cache_key]
            enriched_entries.append(enriched_entry)
        return enriched_entries

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
        "editors": enrich_acl_with_org_names(info["editors"] if "editors" in info else []),
        "viewers": enrich_acl_with_org_names(info["viewers"] if "viewers" in info else []),
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
        "alias": {"type": "string", "minLength": 5},
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
        req["expiration_time"] = datetime.fromisoformat(req["expiration_time"].replace("Z", ""))
    try:
        link = client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)

    if not client.users.has_role(netid, "admin") and not client.links.may_edit(link_id, netid):
        abort(403)
    if "alias" in req:
        if client.links.alias_is_duplicate(req["alias"], link.get("is_tracking_pixel_link", False)):
            abort(400)
        if client.links.alias_is_reserved(req["alias"]):
            abort(400)
        if not client.users.has_role(netid, "admin") and not client.users.has_role(netid, "power_user"):
            abort(403)

    if "owner" in req:
        if not client.users.has_role(netid, "admin") and not client.links.is_owner(link_id, netid):
            abort(403)
        validate_modification(netid, client, req["owner"])

    try:
        client.links.modify(
            link_id,
            title=req.get("title"),
            long_url=req.get("long_url"),
            expiration_time=req.get("expiration_time"),
            owner=req.get("owner"),
            alias=req.get("alias"),
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


def validate_modification(netid: str, client: ShrunkClient, owner: Dict[str, Any]) -> None:
    if owner["type"] == "netid":
        if not is_valid_netid(owner["_id"]) or client.users.has_role(owner["_id"], "guest"):
            abort(400)
        return

    try:
        org_id = ObjectId(owner["_id"])
    except bson.errors.InvalidId:
        abort(400)

    if not client.orgs.get_org(org_id):
        abort(400)
    if not client.orgs.is_member(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)


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
    if not client.users.has_role(netid, "admin") and not client.links.may_edit(link_id, netid):
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
        client.links.modify_acl(link_id, req["entry"], req["action"] == "add", req["acl"])
    except InvalidACL:
        return jsonify({"errors": ["invalid acl"]})
    except NotUserOrOrg as e:
        return jsonify({"errors": ["not user or org: " + str(e)]}), 400
    return "", 204


MODIFY_BULK_ACL_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["link_ids", "entry", "acl", "action"],
    "properties": {
        "link_ids": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": True,
            "items": {
                "type": "string",
            },
        },
        "entry": ACL_ENTRY_SCHEMA,
        "acl": {"type": "string", "enum": ["editors", "viewers"]},
        "action": {"type": "string", "enum": ["add", "remove"]},
    },
}


@bp.route("/acl_bulk", methods=["POST"])
@request_schema(MODIFY_BULK_ACL_SCHEMA)
@require_login
def modify_acl_bulk(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/link/acl_bulk``

    Modifies a list of links' ACLs if the user has permission to edit them.
    Returns 204 on success and 403 if any link could not be modified.
    """

    link_ids = req["link_ids"]
    try:
        if req["entry"]["type"] == "org":
            req["entry"]["_id"] = ObjectId(req["entry"]["_id"])
    except bson.errors.InvalidId:
        abort(400)

    try:
        object_ids = [ObjectId(link_id) for link_id in link_ids]
    except bson.errors.InvalidId:
        invalid_ids = [link_id for link_id in link_ids if not ObjectId.is_valid(link_id)]
        return (
            jsonify(
                {
                    "errors": ["Unable to share one or more links."],
                    "failed_ids": invalid_ids,
                }
            ),
            403,
        )

    try:
        client.links.modify_acl_bulk(
            object_ids,
            link_ids,
            netid,
            req["entry"],
            req["action"] == "add",
            req["acl"],
        )
    except BulkLinkValidationError as error:
        return (
            jsonify(
                {
                    "errors": ["Unable to share one or more links."],
                    "failed_ids": error.failed_ids,
                }
            ),
            403,
        )
    except InvalidACL:
        return jsonify({"errors": ["invalid acl"]}), 400
    except NotUserOrOrg as error:
        return jsonify({"errors": ["not user or org: " + str(error)]}), 400

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
    if not client.users.has_role(netid, "admin") and not client.links.is_owner(link_id, netid):
        abort(403)
    client.links.delete(link_id, netid)
    return "", 204


BULK_DELETE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["link_ids"],
    "properties": {
        "link_ids": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": True,
            "items": {
                "type": "string",
            },
        }
    },
}


TRANSFER_BULK_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["link_ids", "owner"],
    "properties": {
        "link_ids": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": True,
            "items": {
                "type": "string",
            },
        },
        "owner": ACL_ENTRY_SCHEMA,
    },
}


@bp.route("/transfer_bulk", methods=["POST"])
@request_schema(TRANSFER_BULK_SCHEMA)
@require_login
def transfer_links_bulk(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/link/transfer_bulk``

    Transfers ownership for a list of links if the user has owner-level permission
    for every link and the new owner is valid.
    """
    link_ids = req["link_ids"]

    owner = req["owner"]
    validate_modification(netid, client, owner)
    if owner["type"] == "org":
        owner = {**owner, "_id": ObjectId(owner["_id"])}
    try:
        object_ids = [ObjectId(link_id) for link_id in link_ids]
    except bson.errors.InvalidId:
        invalid_ids = [link_id for link_id in link_ids if not ObjectId.is_valid(link_id)]
        return (
            jsonify(
                {
                    "errors": ["Unable to transfer one or more links."],
                    "failed_ids": invalid_ids,
                }
            ),
            403,
        )

    try:
        client.links.transfer_bulk(object_ids, link_ids, netid, owner)
    except BulkLinkValidationError as error:
        return (
            jsonify(
                {
                    "errors": ["Unable to transfer one or more links."],
                    "failed_ids": error.failed_ids,
                }
            ),
            403,
        )
    except NotUserOrOrg as error:
        return jsonify({"errors": ["not user or org: " + str(error)]}), 400

    return "", 204


@bp.route("/delete_bulk", methods=["POST"])
@request_schema(BULK_DELETE_SCHEMA)
@require_login
def delete_links_bulk(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/link/delete_bulk``

    Deletes a list of links. From an array of link ids, deletes those links if the user has permission to delete them. Returns 204 on success and 403 on error

    """
    link_ids = req["link_ids"]
    try:
        object_ids = [ObjectId(link_id) for link_id in link_ids]
    except bson.errors.InvalidId:
        invalid_ids = [link_id for link_id in link_ids if not ObjectId.is_valid(link_id)]
        return (
            jsonify(
                {
                    "errors": ["Unable to delete one or more links."],
                    "failed_ids": invalid_ids,
                }
            ),
            403,
        )

    try:
        client.links.delete_bulk_transactional(object_ids, link_ids, netid)
    except BulkLinkValidationError as error:
        return (
            jsonify(
                {
                    "errors": ["Unable to delete one or more links."],
                    "failed_ids": error.failed_ids,
                }
            ),
            403,
        )
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
    if not client.users.has_role(netid, "admin") and not client.links.is_owner(link_id, netid):
        abort(403)
    client.links.clear_visits(link_id)
    return "", 204


@bp.route("/<ObjectId:link_id>/request_edit_access", methods=["POST"])
@require_mail
@require_login
def post_request_edit(netid: str, client: ShrunkClient, mail: Mail, link_id: ObjectId) -> Any:
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.users.has_role(netid, "admin") and not client.links.may_view(link_id, netid):
        abort(403)
    try:
        client.links.request_edit_access(mail, link_id, netid)
    except OrgOwnedLinkNotSupported:
        return (
            jsonify({"message": "Requesting edit access is not supported for links owned by an organization"}),
            400,
        )
    return "", 204


@bp.route("/<ObjectId:link_id>/cancel_request_edit_access", methods=["POST"])
@require_mail
@require_login
def cancel_request_edit(netid: str, client: ShrunkClient, mail: Mail, link_id: ObjectId) -> Any:
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.users.has_role(netid, "admin") and not client.links.may_view(link_id, netid):
        abort(403)
    client.links.cancel_request_edit_access(mail, link_id, netid)
    return "", 204


@bp.route("/<ObjectId:link_id>/active_request_exists", methods=["GET"])
@require_mail
@require_login
def request_exists(netid: str, client: ShrunkClient, mail: Mail, link_id: ObjectId) -> Any:
    try:
        client.links.get_link_info(link_id)
    except NoSuchObjectException:
        abort(404)
    if not client.users.has_role(netid, "admin") and not client.links.may_view(link_id, netid):
        abort(403)
    exists = client.links.active_request_exists(mail, link_id, netid)
    return jsonify(exists)


def anonymize_visit(client: ShrunkClient, visit: Any) -> Any:
    """Anonymize a visit by replacing its source IP with an opaque visitor ID.

    :param client:
    :param visit:
    """

    visit_anonymized = {
        "link_id": visit["link_id"],
        "alias": visit["alias"],
        "visitor_id": client.links.get_visitor_id(visit["source_ip"]),
        "user_agent": visit.get("user_agent", "Unknown"),
        "referer": get_human_readable_referer_domain(visit.get("referer", "Unknown")),
        "state_code": (visit.get("state_code", "Unknown") if visit.get("country_code") == "US" else "Unknown"),
        "country_code": visit.get("country_code", "Unknown"),
        "time": visit["time"],
    }

    if "mid" in visit:
        visit_anonymized["mid"] = visit["mid"]
    if "uid" in visit:
        visit_anonymized["uid"] = visit["uid"]

    return visit_anonymized


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
    if not client.users.has_role(netid, "admin") and not client.links.may_view(link_id, netid):
        abort(403)
    visits = client.links.get_visits(link_id)

    def generate():
        output = StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "link_id",
                "alias",
                "visitor_id",
                "mid",
                "uid",
                "user_agent",
                "referer",
                "state_code",
                "country_code",
                "time",
            ]
        )
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        for visit in visits:
            anon_visit = anonymize_visit(client, visit)
            writer.writerow(
                [
                    anon_visit["link_id"],
                    anon_visit["alias"],
                    anon_visit.get("visitor_id", ""),
                    anon_visit.get("mid", ""),
                    anon_visit.get("uid", ""),
                    anon_visit["user_agent"],
                    anon_visit["referer"],
                    anon_visit["state_code"],
                    anon_visit["country_code"],
                    anon_visit["time"].isoformat(),
                ]
            )
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    return Response(
        generate(),
        headers={
            "content-disposition": f"attachment; filename={link_id}.csv",
            "Content-Type": "text/csv",
        },
    )


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
    if not client.users.has_role(netid, "admin") and not client.links.may_view(link_id, netid):
        abort(403)

    source = request.args.get("source")

    stats = client.links.get_overall_visits(link_id, None, source)
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

    This endpoint supports passing start_date and end_date via url
    parameters, the dates must be in ISO format. The start date must
    be before the end date, the parameters are optional, the default
    behavior is the following:

    - If start date exists but not end date, the range goes from the
      start date to today's date.
    - If end date exists but not start date, the range goes from the
      one year from the end date to the end date
    - If neither exists, then the range is from one year from today,
      to today's date

    :param netid:
    :param client:
    :param link_id:
    """
    if not client.users.has_role(netid, "admin") and not client.links.may_view(link_id, netid):
        abort(403)

    # If start_date exists but not end_date, we default to <start_date, today>
    # If end_date exists but not start_date, we default to <year from end_date, end_date>
    # If neither exists, then it is just, <year from today, today>
    end_date = datetime.fromisoformat(request.args.get("end_date", datetime.now().isoformat()))
    start_date = datetime.fromisoformat(request.args.get("start_date", (end_date - timedelta(days=365)).isoformat()))

    if start_date > end_date:
        return jsonify({"error": "start_date must be before end_date"})

    source = request.args.get("source")

    visits = client.links.get_daily_visits(link_id, date_range=(start_date, end_date), source=source)
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
    if not client.users.has_role(netid, "admin") and not client.links.may_view(link_id, netid):
        abort(403)

    source = request.args.get("source")

    geoip = client.links.get_geoip_stats(link_id, source=source)
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
    if not client.users.has_role(netid, "admin") and not client.links.may_view(link_id, netid):
        abort(403)

    source = request.args.get("source")

    visits = client.links.get_visits(link_id, source=source)
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

    if not client.users.has_role(netid, "admin") and not client.links.may_edit(link_id, netid):
        abort(403)

    alias = info["alias"]
    if client.links.alias_is_reserved(alias) and client.links.alias_is_duplicate(alias, info["is_tracking_pixel_link"]):
        abort(400)

    try:
        client.links.remove_expiration_time(link_id)

    except NoSuchObjectException:
        abort(404)
    return "", 204
