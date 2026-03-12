"""Implements endpoints under ``/api/search``"""

from datetime import datetime
from typing import Any

from flask import Blueprint, jsonify
from werkzeug.exceptions import abort
from bson import ObjectId
import bson.errors

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login, request_schema

__all__ = ["bp"]

bp = Blueprint("search", __name__, url_prefix="/api/core/search")

SEARCH_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "set",
        "show_expired_links",
        "show_deleted_links",
        "sort",
        "show_type",
    ],
    "properties": {
        "alias": {"type": "string"},
        "url": {"type": "string"},
        "title": {"type": "string"},
        "query": {"type": "string"},
        # Accept an array of sets for multi-filter support
        "set": {
            "type": "array",
            "minItems": 1,
            "items": {
                "oneOf": [
                    {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["set"],
                        "properties": {
                            "set": {
                                "type": "string",
                                "enum": ["user", "shared", "all"],
                            },
                        },
                    },
                    {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["set", "org"],
                        "properties": {
                            "set": {
                                "type": "string",
                                "enum": ["org"],
                            },
                            "org": {"type": "string"},
                        },
                    },
                ],
            },
        },
        "show_expired_links": {"type": "boolean"},
        "show_deleted_links": {"type": "boolean"},
        "sort": {
            "type": "object",
            "additionalProperties": False,
            "required": ["key", "order"],
            "properties": {
                "key": {
                    "type": "string",
                    "enum": ["created_time", "title", "visits", "relevance"],
                },
                "order": {
                    "type": "string",
                    "enum": ["ascending", "descending"],
                },
            },
        },
        "pagination": {
            "type": "object",
            "additionalProperties": False,
            "required": ["skip", "limit"],
            "properties": {
                "skip": {"type": "integer", "minimum": 0},
                "limit": {"type": "integer", "minimum": 1},
            },
        },
        "begin_time": {
            "type": "string",
            "format": "date-time",
        },
        "end_time": {
            "type": "string",
            "format": "date-time",
        },
        "show_type": {
            "type": "string",
            "enum": ["links", "tracking_pixels"],
        },
        "owner": {
            "type": "string",
            "description": "Filter links by owner netid",
        },
    },
}


@bp.route("", methods=["POST"])
@request_schema(SEARCH_SCHEMA)
@require_login
def post_search_urls(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/search``

    Execute a search query. Request format:

    .. code-block:: json

       {
         "query?": "string",
         "set": [
           {
             "set": "'user' | 'shared' | 'all' | 'org'",
             "org?": "string"
           }
         ],
         "show_expired_links": "boolean",
         "show_deleted_links": "boolean",
         "sort": {
           "key": "'created_time' | 'title' | 'visits' | 'relevance'",
           "order": "'ascending' | 'descending'"
         },
         "pagination?": {
           "skip": "number",
           "limit": "number"
         },
         "begin_time?": "date-time",
         "end_time?": "date-time"
       }

    Response format:

    .. code-block:: json

       {
          "count": "number",
          "results": [ {
            "id": "string",
            "title": "string",
            "long_url": "string",
            "created_time": "date-time",
            "expiration_time": "date-time | null",
            "visits": "number",
            "unique_visits": "number",
            "owner": "string",
            "aliases": [ { "alias": "string", "deleted": "boolean" } ],
            "is_expired": "boolean",
            "deletion_info?": {
              "deleted_by": "string",
              "deleted_time": "date-time"
            }
          } ]
       }

    :param netid:
    :param client:
    :param req:
    """
    is_admin = client.users.has_role(netid, "admin")
    

    sets = [item["set"] for item in req["set"]]

    if "all" in sets and not is_admin:
        abort(403)

    if client.users.has_role(netid, "guest"):
        org = client.orgs.get_orgs(netid, True)[0]
        req["set"] = [
            {
                "set": "org",
                "org": str(org["id"]),
            }
        ]
        sets = ["org"]

    if req.get("show_deleted_links", False) and not is_admin:
        abort(403)

    if "org" in sets:
        for item in req["set"]:
            if item["set"] == "org":
                try:
                    item["org"] = ObjectId(item["org"])
                except bson.errors.InvalidId:
                    abort(400)

                if not is_admin and not client.orgs.is_member(item["org"], netid):
                    abort(403)

    if "begin_time" in req:
        req["begin_time"] = datetime.fromisoformat(req["begin_time"])

    if "end_time" in req:
        req["end_time"] = datetime.fromisoformat(req["end_time"])

    result = client.search.execute_url(netid, req)
    return jsonify(result)


SEARCH_ORG_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["sort", "pagination"],
    "properties": {
        "query": {"type": "string"},
        "filter_deleted": {"type": "boolean"},
        "filter_role": {
            "type": "array",
            "items": {"type": "string", "enum": ["admin", "member", "guest"]},
        },
        "filter_member": {"type": "string"},
        "sort": {
            "type": "object",
            "additionalProperties": False,
            "required": ["key", "order"],
            "properties": {
                "key": {
                    "type": "string",
                    "enum": ["name", "timeCreated", "memberCount", "role", "dateAdded"],
                },
                "order": {
                    "type": "string",
                    "enum": ["ascending", "descending"],
                },
            },
        },
        "pagination": {
            "type": "object",
            "additionalProperties": False,
            "required": ["skip", "limit"],
            "properties": {
                "skip": {"type": "integer", "minimum": 0},
                "limit": {"type": "integer", "minimum": 1},
            },
        },
    },
}


@bp.route("/org", methods=["POST"])
@request_schema(SEARCH_ORG_SCHEMA)
@require_login
def post_search_orgs(netid: str, client: ShrunkClient, req: Any) -> Any:
    """``POST /api/core/search/org``

    Execute an organization search query.
    """
    # Only admins can see deleted organizations
    if req.get("filter_deleted", False) and not client.roles.has("admin", netid):
        abort(403)

    result = client.orgs.search(netid, req)
    return jsonify(result)
