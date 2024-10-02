"""Implements API endpoints under ``/api/linkhub``"""

from typing import Any

from flask import Blueprint, jsonify, current_app

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login, request_schema

__all__ = ["bp"]

bp = Blueprint("linkhub", __name__, url_prefix="/api/v1/linkhub")

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

SEARCH_LINKHUB_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["netid"],
    "properties": {
        "netid": {"type": "string", "minLength": 1},
    },
}


@bp.route("/search", methods=["POST"])
@request_schema(SEARCH_LINKHUB_SCHEMA)
@require_login
def search_linkhubs(netid: str, client: ShrunkClient, req: Any) -> Any:
    results = client.linkhubs.search(req["netid"])

    return jsonify({"success": True, "results": results})


CREATE_LINKHUB_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title"],
    "properties": {
        "title": {"type": "string", "minLength": 1},
        "alias": {"type": "string", "minLength": 1},
    },
}


@bp.route("", methods=["POST"])
@request_schema(CREATE_LINKHUB_SCHEMA)
@require_login
def create_linkhub(netid: str, client: ShrunkClient, req: Any) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    # Leadership has requested that only one user can own one LinkHub.
    if client.linkhubs.get_by_netid(netid) is not None:
        return jsonify({"success": False, "error": "No permission"}), 401

    result_id, alias = client.linkhubs.create(req["title"], netid, alias=netid)
    return jsonify({"id": result_id, "alias": alias})


@bp.route("/<string:linkhub_id>", methods=["DELETE"])
@require_login
def delete_linkhub_by_id(netid: str, client: ShrunkClient, linkhub_id: str) -> Any:
    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    # Leadership has requested that only one user can own one LinkHub.
    return jsonify({"success": False, "error": "No permission"}), 401

    result = client.linkhubs.delete(linkhub_id)
    if not result:
        return jsonify({"success": False, "error": "Does not exist"}), 404

    return jsonify({"success": True}), 200


@bp.route("/<string:linkhub_id>/private", methods=["GET"])
@require_login
def get_linkhub_by_id_with_login(
    netid: str, client: ShrunkClient, linkhub_id: str
) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    if not client.linkhubs.can_view(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    result = client.linkhubs.get_by_id(linkhub_id)
    if result is None:
        return jsonify({"success": False, "error": "Does not exist"}), 404

    return jsonify(result)


@bp.route("/<string:alias>/public", methods=["GET"])
def get_linkhub_by_alias(alias: str) -> Any:
    """Gives the end-user less information on what the document contains."""
    client = current_app.client

    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    result = client.linkhubs.get_by_alias(alias)

    if result is None or not result["is_public"]:
        return jsonify({"success": False, "error": "Does not exist"}), 404

    del result["owner"]
    del result["collaborators"]
    del result["is_public"]

    return jsonify(result)


ADD_LINK_TO_LINKHUB_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "url"],
    "properties": {
        "title": {"type": "string", "minLength": 1},
        "url": {"type": "string", "minLength": 1},
    },
}


@bp.route("/<string:linkhub_id>/add-element", methods=["POST"])
@request_schema(ADD_LINK_TO_LINKHUB_SCHEMA)
@require_login
def add_link_to_linkhub(
    netid: str, client: ShrunkClient, req: Any, linkhub_id: str
) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    client.linkhubs.add_link_to_linkhub(linkhub_id, req["title"], req["url"])

    return jsonify({"success": True})


SET_CHANGE_LINKHUB_TITLE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "url", "index"],
    "properties": {
        "title": {"type": "string", "minLength": 1},
        "url": {"type": "string", "minLength": 1},
        "index": {"type": "integer", "minimum": 0},
    },
}


@bp.route("/<string:linkhub_id>/set-element", methods=["POST"])
@request_schema(SET_CHANGE_LINKHUB_TITLE_SCHEMA)
@require_login
def set_link_from_linkhub(
    netid: str, client: ShrunkClient, req: Any, linkhub_id: str
) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    client.linkhubs.set_data_at_link_to_linkhub(
        linkhub_id, req["index"], req["title"], req["url"]
    )

    return jsonify({"success": True})


CHANGE_LINKHUB_TITLE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title"],
    "properties": {
        "title": {"type": "string", "minLength": 1},
    },
}


@bp.route("/<string:linkhub_id>/title", methods=["POST"])
@request_schema(CHANGE_LINKHUB_TITLE_SCHEMA)
@require_login
def change_linkhub_title(
    netid: str, client: ShrunkClient, req: Any, linkhub_id: str
) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    client.linkhubs.change_title(linkhub_id, req["title"])

    return jsonify({"success": True})


CHANGE_LINKHUB_TITLE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["alias"],
    "properties": {
        "alias": {"type": "string", "minLength": 1},
    },
}


@bp.route("/<string:linkhub_id>/alias", methods=["POST"])
@request_schema(CHANGE_LINKHUB_TITLE_SCHEMA)
@require_login
def change_linkhub_alias(
    netid: str, client: ShrunkClient, req: Any, linkhub_id: str
) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    # Leadership has requested that only one user can own one LinkHub.
    return jsonify({"success": False, "error": "No permission"}), 401

    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    client.linkhubs.change_alias(linkhub_id, req["alias"])

    return jsonify({"success": True})


DELETE_LINK_FROMLINKHUB_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["index"],
    "properties": {
        "index": {"type": "integer", "minimum": 0},
    },
}


@bp.route("/<string:linkhub_id>/element", methods=["DELETE"])
@request_schema(DELETE_LINK_FROMLINKHUB_SCHEMA)
@require_login
def delete_link_from_linkhub(
    netid: str, client: ShrunkClient, req: Any, linkhub_id: str
) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    client.linkhubs.delete_element_at_index(linkhub_id, req["index"])

    return jsonify({"success": True})


ADD_COLLABORATOR_BY_NETID_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["identifier", "permission"],
    "properties": {
        "identifier": {"type": "string", "minimum": 0},
        "permission": {"type": "string", "minimum": 0},
        "type": {"type": "string", "minimum": 0},
    },
}


@bp.route("/<string:linkhub_id>/share", methods=["POST"])
@request_schema(ADD_COLLABORATOR_BY_NETID_SCHEMA)
@require_login
def add_collaborator(
    netid: str, client: ShrunkClient, req: Any, linkhub_id: str
) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    if "netid" == req["type"]:
        linkhub_data = client.linkhubs.get_by_id(linkhub_id)
        if req["identifier"] in [netid, linkhub_data["owner"]]:
            return (
                jsonify({"success": False, "error": "This netid is not allowed."}),
                406,
            )

    client.linkhubs.add_collaborator(
        linkhub_id, req["identifier"], req["type"], req["permission"]
    )

    return jsonify({"success": True})


REMOVE_COLLABORATOR_BY_NETID_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["identifier"],
    "properties": {
        "identifier": {"type": "string", "minimum": 0},
        "type": {"type": "string", "minimum": 0},
    },
}


@bp.route("/<string:linkhub_id>/share", methods=["DELETE"])
@request_schema(REMOVE_COLLABORATOR_BY_NETID_SCHEMA)
@require_login
def remove_collaborator(
    netid: str, client: ShrunkClient, req: Any, linkhub_id: str
) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    if "netid" == req["type"]:
        linkhub_data = client.linkhubs.get_by_id(linkhub_id)
        if req["identifier"] in [netid, linkhub_data["owner"]]:
            return (
                jsonify({"success": False, "error": "This netid is not allowed."}),
                406,
            )

    result = client.linkhubs.remove_collaborator(
        linkhub_id, req["identifier"], req["type"]
    )

    return jsonify({"success": result}), 200 if result else 500


PUBLISH_LINKHUB_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["value"],
    "properties": {
        "value": {"type": "boolean"},
    },
}


@bp.route("/<string:linkhub_id>/publish", methods=["POST"])
@request_schema(PUBLISH_LINKHUB_SCHEMA)
@require_login
def publish_linkhub(netid: str, client: ShrunkClient, req: Any, linkhub_id: str) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    client.linkhubs.set_publish_status(linkhub_id, req["value"])

    return jsonify({"success": True, "publish-status": req["value"]})


@bp.route("/validate-linkhub-alias/<b32:value>", methods=["GET"])
@require_login
def validate_alias_linkhub(netid: str, client: ShrunkClient, value: str) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    return jsonify({"valid": client.linkhubs.is_alias_valid(value)})


@bp.route("/is-linkhub-enabled", methods=["GET"])
def is_linkhub_enabled() -> Any:
    return jsonify({"status": current_app.client.linkhubs.is_enabled})


@bp.route("/netid/<string:netid_query>", methods=["GET"])
@require_login
def get_linkhubs_from_netid(netid: str, client: ShrunkClient, netid_query: str) -> Any:
    if not client.linkhubs.is_enabled:
        return (
            jsonify({"success": False, "error": "LinkHub has been disabled"}),
            503,
        )

    if netid_query != netid:
        return jsonify({"error": "No permission"}), 401

    return jsonify({"results": client.linkhubs.search(netid_query)}), 200
