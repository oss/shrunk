"""
EXTERNAL API (VERSION 1)

LIMITATIONS APPLY!
"""

from shrunk.client import ShrunkClient
from flask import Blueprint, jsonify, request, Response

CREATE_LINK_SCHEMA = {"type": "object", "required": ["originalUrl"]}


__all__ = ["bp"]

bp = Blueprint("link", __name__, url_prefix="/api/core/link")

CREATE_LINK_SCHEMA = {
    "type": "object",
    "required": [
        "original-url",
    ],
    "properties": {"original-url": {"type": "string", "minLength": 1}},
}
