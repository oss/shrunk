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
    alias = None
    if "alias" in req:
        alias = req["alias"]

    result_id, alias = client.linkhubs.create(req["title"], netid, alias=alias)
    return jsonify({"id": result_id, "alias": alias})


@bp.route("/<string:linkhub_id>/private", methods=["GET"])
@require_login
def get_linkhub_by_id_with_login(
    netid: str, client: ShrunkClient, linkhub_id: str
) -> Any:
    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    result = client.linkhubs.get_by_id(linkhub_id)
    if result is None:
        return jsonify({"success": False, "error": "Does not exist"}), 404

    return jsonify(result)


@bp.route("/<string:alias>/public", methods=["GET"])
def get_linkhub_by_alias(alias: str) -> Any:
    """Gives the end-user less information on what the document contains."""
    client = current_app.client
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
    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    client.linkhubs.delete_element_at_index(linkhub_id, req["index"])

    return jsonify({"success": True})


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
    if not client.linkhubs.can_edit(linkhub_id, netid):
        return jsonify({"success": False, "error": "No permission"}), 401

    client.linkhubs.set_publish_status(linkhub_id, req["value"])

    return jsonify({"success": True})


@bp.route("/validate-linkhub-alias/<b32:value>", methods=["GET"])
@require_login
def validate_alias_linkhub(netid: str, client: ShrunkClient, value: str) -> Any:
    return jsonify({"valid": client.linkhubs.is_alias_valid(value)})
