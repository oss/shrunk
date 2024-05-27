"""Implements API endpoints under ``/api/linkhub``"""

from typing import Any

from flask import Blueprint, jsonify

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


@bp.route("/<string:alias>", methods=["GET"])
@require_login
def get_linkhub(_netid: str, client: ShrunkClient, alias: str) -> Any:
    result = client.linkhubs.get_by_alias(alias)
    if result is None:
        return jsonify({"error": "does not exist"})  # TODO: make cleaner.

    return jsonify(result)


ADD_LINK_TO_LINKHUB_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title", "url"],
    "properties": {
        "title": {"type": "string", "minLength": 1},
        "url": {"type": "string", "minLength": 1},
        "index": {"type": "integer", "minimum": 0},
    },
}


@bp.route("/<string:alias>/add-element", methods=["POST"])
@request_schema(ADD_LINK_TO_LINKHUB_SCHEMA)
@require_login
def add_link_to_linkhub(_netid: str, client: ShrunkClient, req: Any, alias: str) -> Any:
    # TODO: Add security.

    client.linkhubs.add_link_to_linkhub(alias, req["title"], req["url"])


CHANGE_LINKHUB_TITLE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["title"],
    "properties": {
        "title": {"type": "string", "minLength": 1},
    },
}


@bp.route("/<string:alias>/title", methods=["POST"])
@request_schema(CHANGE_LINKHUB_TITLE_SCHEMA)
@require_login
def change_linkhub_title(
    _netid: str, client: ShrunkClient, req: Any, alias: str
) -> Any:
    # TODO: Add security.

    client.linkhubs.change_title(alias, req["title"])
