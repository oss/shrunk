"""Implements API endpoints under ``/api/org``"""

from typing import Any, Dict

import bson
import bson.errors
from flask import Blueprint, jsonify, request
from werkzeug.exceptions import abort
from bson import ObjectId

from shrunk.api_errors import ApiProblem
from shrunk.client import ShrunkClient
from shrunk.mongo_schema import MongoRef
from shrunk.util.ldap import is_valid_netid, is_university_guest
from shrunk.util.decorators import require_login, request_schema

__all__ = ["bp"]

bp = Blueprint("org", __name__, url_prefix="/api/core/org")

LIST_ORGS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["which"],
    "properties": {
        "which": {
            "type": "string",
            "enum": ["user", "all"],
        },
    },
}


@bp.route("/list", methods=["POST"])
@request_schema(LIST_ORGS_SCHEMA)
@require_login
def get_orgs(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/org/list``

    Lists organizations. Request format:

    .. code-block:: json

       { "which": "'user' | 'all'" }

    where the ``"which"`` property specifies whether to return information about all organizations
    or only organizations of which the requesting user is a member. Only administrators may use the ``"all"``
    option. Response format:

    .. code-block:: json

       { "orgs": [ {
           "id": "string",
           "name": "string",
           "is_member": "boolean",
           "is_admin": "boolean",
           "timeCreated": "date-time",
           "members": [
             { "netid": "string", "timeCreated": "date-time", "is_admin": "boolean" }
           ]
         } ]
       }

    Where the top-level ``"is_member"`` and ``"is_admin"`` properties specify respectively whether the requesting
    user is a member and/or an administrator of the organization.

    :param netid:
    :param client:
    :param req:
    """
    if req["which"] == "all" and not client.users.has_role(netid, "admin"):
        abort(403)
    orgs = client.orgs.get_orgs(netid, req["which"] == "user")
    return jsonify({"orgs": orgs})


CREATE_ORG_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["name"],
    "properties": {
        "name": {
            "type": "string",
            "pattern": r"^[a-zA-Z0-9_.,\- ]*$",
            "minLength": 1,
        },
    },
}


@bp.route("", methods=["POST"])
@request_schema(CREATE_ORG_SCHEMA)
@require_login
def post_org(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/org``

    Create a new organization. The requesting user is automatically an administrator of the
    newly-created organization. Returns the ID of the created organization. Request format:

    .. code-block:: json

       { "name": "string" }

    Response format:

    .. code-block:: json

       { "id": "string" }

    :param netid:
    :param client:
    :param req:
    """
    if not client.users.has_role(netid, "facstaff") and not client.users.has_role(netid, "admin"):
        abort(403)
    org_id = client.orgs.create(req["name"])
    if org_id is None:
        raise ApiProblem(
            409,
            "ORGANIZATION_NAME_TAKEN",
            "An organization with this name already exists. Choose a different name.",
            fields={"name": "Choose a different organization name."},
        )
    client.orgs.create_member(org_id, netid, "admin")
    return jsonify({"id": org_id, "name": req["name"]})


@bp.route("/<ObjectId:org_id>/hasAssociatedUrls", methods=["GET"])
@require_login
def check_urls(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``GET /api/org/<org_id>/hasAssociatedUrls``

    Checking to see if orgs are associcated with any urls before deleting

    :param netid:
    :param client:
    :param org_id:
    """

    if not client.orgs.is_admin(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)
    has_urls = client.orgs.has_associated_urls(org_id)
    return {"hasAssociatedUrls": has_urls}, 200


@bp.route("/<ObjectId:org_id>", methods=["DELETE"])
@require_login
def delete_org(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``DELETE /api/org/<org_id>``

    Delete an organization. Returns 204 on success.

    :param netid:
    :param client:
    :param org_id:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)
    client.orgs.delete(org_id, netid)
    return "", 204


@bp.route("/<ObjectId:org_id>", methods=["GET"])
@require_login
def get_org(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``GET /api/org/<org_id>``

    Get information about an organization. For response format, see :py:func:`get_orgs`.

    :param netid:
    :param client:
    :param org_id:
    """
    if not client.orgs.is_member(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)
    org = client.orgs.get_org(org_id)
    if org is None:
        abort(404)

    response_org: Dict[str, Any] = dict(org)
    if client.orgs.is_admin(org_id, netid):
        response_org["role"] = "admin"
    elif client.orgs.is_guest(org_id, netid):
        response_org["role"] = "guest"
    else:
        response_org["role"] = "member"

    response_org["id"] = response_org["_id"]

    del response_org["_id"]
    return jsonify(response_org)


@bp.route("/<ObjectId:org_id>/links", methods=["GET"])
@require_login
def get_org_links(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``GET /api/org/<org_id>/links``

    Get a list of all links associated with an organization.

    :param netid:
    :param client:
    :param org_id:
    """

    resp = client.orgs.get_org(org_id)
    if resp is None:
        abort(404)

    if not client.orgs.is_member(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)
    links = client.orgs.get_links(org_id)
    is_admin = client.users.has_role(netid, "admin")
    for link in links:
        deleted = link.get("deleted", False)
        if link["owner"]["type"] == "netid":
            is_link_owner = link["owner"]["_id"] == netid
        else:
            is_link_owner = client.orgs.is_admin(link["owner"]["_id"], netid)
        can_own_manage = is_admin or is_link_owner
        link["canDelete"] = not deleted and can_own_manage
        link["canTransfer"] = not deleted and can_own_manage
    return jsonify(links)


@bp.route("/<ObjectId:org_id>/rename/<string:new_org_name>", methods=["PUT"])
@require_login
def rename_org(netid: str, client: ShrunkClient, org_id: ObjectId, new_org_name: str) -> Any:
    """`PUT /api/org/<org_id>/rename/<new_org_name>`

    Changes an organization's name if user is the admin of the org.

    :param org_id:
    :param new_org_name:
    """
    org = client.orgs.get_org(org_id)
    if org is None:
        abort(404)
    if (
        not client.orgs.is_member(org_id, netid) and not client.orgs.is_admin(org_id, netid)
    ) or not client.orgs.validate_name(new_org_name):
        abort(403)
    client.orgs.rename_org(org_id, new_org_name)
    return jsonify(org)


VALIDATE_NAME_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["name"],
    "properties": {
        "name": {"type": "string"},
    },
}


@bp.route("/validate_name", methods=["POST"])
@request_schema(VALIDATE_NAME_SCHEMA)
@require_login
def validate_org_name(_netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/org/validate_name``

    Validate an organization name. This endpoint is used for form validation in the frontend. Request format:

    .. code-block:: json

       { "name": "string" }

    Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param req:
    """
    valid = client.orgs.validate_name(req["name"])
    response: Dict[str, Any] = {"valid": valid}
    if not valid:
        response["reason"] = "That name is already taken."
    return jsonify(response)


VALIDATE_NETID_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["netid"],
    "properties": {
        "netid": {"type": "string"},
    },
}


@bp.route("/validate_netid", methods=["POST"])
@request_schema(VALIDATE_NETID_SCHEMA)
@require_login
def validate_netid(_netid: str, _client: ShrunkClient, req: Any) -> Any:
    """``POST /api/org/validate_netid``

    Check that a NetID is valid. This endpoint is used for form validation in the frontend. Request format:

    .. code-block:: json

       { "netid": "string" }

    Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param req:
    """
    valid = is_valid_netid(req["netid"])
    response: Dict[str, Any] = {"valid": valid}
    if not valid:
        response["reason"] = "That NetID is not valid."
    return jsonify(response)


@bp.route("/validate_guest", methods=["POST"])
@request_schema(VALIDATE_NETID_SCHEMA)
@require_login
def validate_guest(_netid: str, _client: ShrunkClient, req: Any) -> Any:
    """``POST /api/org/validate_guest``

    Check that a guest NetID is valid. This endpoint is used for form validation in the frontend. Request format:

    .. code-block:: json

       { "netid": "string" }

    Response format:

    .. code-block:: json

       { "valid": "boolean", "reason?": "string" }

    :param netid:
    :param client:
    :param req:
    """

    valid = is_university_guest(req["netid"])
    response: Dict[str, Any] = {"valid": valid}
    if not valid:
        response["reason"] = "That NetID does not have the guest role."
    return jsonify(response)


@bp.route("/<ObjectId:org_id>/stats", methods=["GET"])
@require_login
def get_org_stats(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``GET /api/org/<org_id>/stats``



    Response format:
    .. code-block:: json

       {
         "total_links": "number",
         "total_visits": "number",
         "unique_visits": "number",
       }

    """

    if client.orgs.get_org(org_id) is None:
        abort(404)
    if not client.orgs.is_member(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)
    stats = client.orgs.get_org_overall_stats(org_id)
    return jsonify(stats)


@bp.route("/<ObjectId:org_id>/stats/visits", methods=["GET"])
@require_login
def get_org_visit_stats(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``GET /api/org/<org_id>/stats/visits``

    Get per-user visit statistics for an org. Response format:

    .. code-block:: json

       {
         "netid": "string",
         "total_visits": "number",
         "unique_visits": "number"
         }
       }

    :param netid:
    :param client:
    :param org_id:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)
    visits = client.orgs.get_visit_stats(org_id)
    return jsonify({"visits": visits})


@bp.route("/<ObjectId:org_id>/stats/geoip", methods=["GET"])
@require_login
def get_org_geoip_stats(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    """``GET /api/org/<org_id>/stats/geoip``

    Get GeoIP statistics about all links belonging to members of the org. For response format,
    see :py:func:`~shrunk.api.link.get_link_geoip_stats`.

    :param netid:
    :param client:
    :param org_id:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)
    geoip = client.orgs.get_geoip_stats(org_id)
    return jsonify({"geoip": geoip})


@bp.route("/<ObjectId:org_id>/member/<member_netid>", methods=["PUT"])
@require_login
def put_org_member(netid: str, client: ShrunkClient, org_id: ObjectId, member_netid: str) -> Any:
    """``PUT /api/org/<org_id>/member/<member_netid>``

    Add a user to an org. Performs no action if the user is already a member of the org. Returns 204
    on success.

    :param netid:
    :param client:
    :param org_id:
    :param member_netid:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)
    client.orgs.create_member(org_id, member_netid)
    return "", 204


@bp.route("/<ObjectId:org_id>/guest/<member_netid>", methods=["PUT"])
@require_login
def put_org_guest(netid: str, client: ShrunkClient, org_id: ObjectId, member_netid: str) -> Any:
    """``PUT /api/org/<org_id>/guest/<member_netid>``

    Add a guest user to an org. Can only add users designated as guests in the university LDAP. A guest may only be apart of one org at a time.

    :param netid: User performing the action
    :param client:
    :param org_id:
    :param member_netid: user to add
    """
    if not client.orgs.is_admin(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)

    if not is_university_guest(member_netid):
        return "That NetID does not have the guest role.", 400

    if len(client.orgs.get_orgs(member_netid, True)) > 0:
        return "Guest user already belongs to an organization", 400

    if client.orgs.create_member(org_id, member_netid, "guest"):
        if client.users.get_user(member_netid) is None:
            client.users.initialize_user(member_netid, "guest", netid)
        else:
            client.users.grant_role(netid, member_netid, "guest")

    return "", 204


@bp.route("/domain", methods=["PUT"])
@require_login
def put_domain(netid: str, client: ShrunkClient) -> Any:
    """PUT /api/core/org/domain

    Add a domain to an org. Expects JSON in the request body:
    {
        "org_name": "...",
        "domain_name": "..."
    }
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiProblem(
            400,
            "INVALID_JSON",
            "The request body must contain valid JSON.",
        )
    org_name = data.get("org_name")
    domain_name = data.get("domain_name")

    if not org_name or not domain_name:
        raise ApiProblem(
            400,
            "MISSING_DOMAIN_DETAILS",
            "Provide both an organization name and a domain name.",
        )

    if not client.users.has_role(netid, "admin"):
        abort(403)

    if not client.orgs.create_domain(org_name, domain_name):
        raise ApiProblem(
            500,
            "DOMAIN_CREATION_FAILED",
            "The domain could not be created. Please try again.",
        )
    return "", 204


@bp.route("/domain", methods=["DELETE"])
@require_login
def delete_domain(netid: str, client: ShrunkClient) -> Any:
    """DELETE /api/core/org/domain

    Delete a domain from an org. Expects JSON in the request body:
    {
        "org_name": "..."
        "domain_name": "..."
    }
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiProblem(
            400,
            "INVALID_JSON",
            "The request body must contain valid JSON.",
        )
    domain_name = data.get("domain_name")
    org_name = data.get("org_name")

    if not org_name or not domain_name:
        raise ApiProblem(
            400,
            "MISSING_DOMAIN_DETAILS",
            "Provide both an organization name and a domain name.",
        )

    if not client.users.has_role(netid, "admin"):
        abort(403)

    if client.orgs.delete_domain(org_name, domain_name) is not True:
        raise ApiProblem(
            500,
            "DOMAIN_DELETION_FAILED",
            "The domain could not be deleted. Please try again.",
        )
    return "", 204


@bp.route("/<ObjectId:org_id>/member/<member_netid>", methods=["DELETE"])
@require_login
def delete_org_member(netid: str, client: ShrunkClient, org_id: ObjectId, member_netid: str) -> Any:
    """``DELETE /api/org/<org_id>/member/<netid>``

    Remove a member from an org. Returns 204 on success.

    :param netid:
    :param client:
    :param org_id:
    :param member_netid:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.users.has_role(netid, "admin"):
        if not netid == member_netid:
            abort(403)
    client.orgs.delete_member(org_id, member_netid)
    return "", 204


MODIFY_ORG_MEMBER_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "role": {"type": "string", "enum": ["admin", "member", "guest"]},
    },
}


@bp.route("/<ObjectId:org_id>/member/<member_netid>", methods=["PATCH"])
@request_schema(MODIFY_ORG_MEMBER_SCHEMA)
@require_login
def patch_org_member(netid: str, client: ShrunkClient, req: Any, org_id: ObjectId, member_netid: str) -> Any:
    """``PATCH /api/org/<org_id>/member/<netid>``

    Modify a member of an org. Returns 204 on success. Request response:

    .. code-block:: json

       { "role": "admin" | "member" | "guest" }

    Properties present in the request will be updated. Properties missing from the request will not be modified.

    :param netid:
    :param client:
    :param req:
    :param org_id:
    :param member_netid:
    """
    if not client.orgs.is_admin(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)
    if req["role"] is not None:
        # Prevent the last admin from being demoted
        admin_count = client.orgs.get_admin_count(org_id)

        if req["role"] == "member" and netid == member_netid and admin_count <= 1:
            abort(400)

        client.orgs.set_member_role(org_id, member_netid, req["role"])
    return "", 204


@bp.route("/valid-permissions", methods=["GET"])
@require_login
def getValidPermissions(_netid: str, client: ShrunkClient) -> Any:
    return jsonify({"permissions": client.access_tokens.access_tokens_permissions})


ACCESS_TOKEN_ORG_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "description", "permissions"],
    "properties": {
        "organizationId": {"type": "string"},
        "title": {"type": "string"},
        "description": {"type": "string"},
        "permissions": {"type": "array"},
    },
}


@bp.route("/access_token", methods=["POST"])
@request_schema(ACCESS_TOKEN_ORG_SCHEMA)
@require_login
def create_access_token(netid: str, client: ShrunkClient, req: Any) -> Any:
    if not req["permissions"]:
        return "permissions is missing", 400
    valid_permissions = client.access_tokens.access_tokens_permissions

    owner: MongoRef = {"_id": netid, "type": "netid"}

    if "organizationId" in req:
        try:
            req["organizationId"] = ObjectId(req["organizationId"])
            owner = {"_id": ObjectId(req["organizationId"]), "type": "org"}
        except bson.errors.InvalidId:
            return "Invalid org id", 400

        if client.orgs.get_org(req["organizationId"]) is None:
            return "No such org", 400

        if not client.orgs.is_admin(req["organizationId"], netid) and not client.users.has_role(netid, "admin"):
            abort(403)
    else:
        if not client.users.has_role(netid, "admin"):
            abort(403)

    for permission in req["permissions"]:
        if permission not in valid_permissions:
            return "invalid permissions", 400
    access_token = client.access_tokens.create(owner, req["title"], req["description"], netid, req["permissions"])

    return jsonify({"access_token": access_token}), 201


@bp.route("/<ObjectId:org_id>/access_token", methods=["GET"])
@require_login
def get_access_tokens(netid: str, client: ShrunkClient, org_id: ObjectId) -> Any:
    if not client.orgs.is_admin(org_id, netid) and not client.users.has_role(netid, "admin"):
        abort(403)

    try:
        org_id = ObjectId(org_id)
        owner: MongoRef = {"_id": ObjectId(org_id), "type": "org"}
    except bson.errors.InvalidId:
        return "Invalid org id", 400

    if client.orgs.get_org(org_id) is None:
        return "No such org", 400

    tokens = client.access_tokens.get_tokens(owner)

    return jsonify({"tokens": list(tokens)})


@bp.route("/super_token", methods=["GET"])
@require_login
def get_super_tokens(netid: str, client: ShrunkClient) -> Any:
    if not client.users.has_role(netid, "admin"):
        abort(403)
    tokens = client.access_tokens.get_tokens()

    return jsonify({"tokens": list(tokens)})


@bp.route("/access_token/<ObjectId:token_id>", methods=["DELETE"])
@require_login
def delete_access_token(netid: str, client: ShrunkClient, token_id: ObjectId) -> Any:
    token_owner = client.access_tokens.get_owner(token_id)
    if token_owner["type"] == "org":
        if not client.orgs.is_admin(ObjectId(token_owner["_id"]), netid) and not client.users.has_role(netid, "admin"):
            abort(403)
    else:
        if not client.users.has_role(netid, "admin"):
            abort(403)
    client.access_tokens.delete_token(token_id, netid)
    return "", 204
