"""
EXTERNAL API (VERSION 1)

LIMITATIONS APPLY!
"""

from shrunk.client import ShrunkClient
from flask import Blueprint, jsonify, request, Response
from shrunk.util.decorators import require_external_token_auth, request_schema


__all__ = ["bp"]

bp = Blueprint("link", __name__, url_prefix="/api/v1/link")

CREATE_LINK_SCHEMA = {
    "type": "object",
    "required": ["originalUrl"],
    "properties": {
        "title": {"type": "string", "minLength": 1},
        "originalUrl": {"type": "string", "minLength": 1},
    },
}

@bp.route("/create", methods=["POST"])
@request_schema(CREATE_LINK_SCHEMA)
@require_external_token_auth
def create_link(client: ShrunkClient, req: dict) -> Response:
    original_url = req["originalUrl"]
    title = req.get("title")

    if not original_url:
        return jsonify({"error": "originalUrl is required"}), 400

    link = client.links.create(title, original_url)
