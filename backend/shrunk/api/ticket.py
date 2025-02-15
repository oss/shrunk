"""Implement API endpoints under ``/api/v1/ticket``"""

import time
from typing import Any

from flask import Blueprint, Response, jsonify, request
from flask_mailman import Mail
from shrunk.client import ShrunkClient
from shrunk.util.decorators import request_schema, require_login, require_mail
from werkzeug.exceptions import abort

__all__ = ["bp"]
bp = Blueprint("ticket", __name__, url_prefix="/api/v1/ticket")

ROLE_REQUESTS = {"power_user", "whitelisted"}
HELP_DESK_EMAIL_SCHEMA = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "category": {"type": "string"},
    },
    "required": ["id", "category"],
}
CREATE_TICKET_SCHEMA = {
    "type": "object",
    "properties": {
        "reason": {
            "type": "string",
            "enum": ["power_user", "whitelisted", "other"],
        },
        "entity": {"type": "string"},
        "user_comment": {"type": "string"},
    },
    "required": ["reason", "user_comment"],
    "dependencies": {
        "reason": {
            "oneOf": [
                {
                    "properties": {"reason": {"enum": ["whitelisted"]}},
                    "required": ["entity"],
                },
                {
                    "properties": {"reason": {"enum": ["power_user", "other"]}},
                    "required": [],
                },
            ]
        }
    },
}

UPDATE_TICKET_SCHEMA = {
    "type": "object",
    "properties": {
        "action": {"type": "string"},
        "actioned_by": {"type": "string"},
        "admin_review": {"type": "string"},
        "is_role_granted": {"type": "boolean"},
    },
    "required": ["action", "actioned_by"],
}


@bp.route("/enabled", methods=["GET"])
@require_login
def get_help_desk_enabled(netid: str, client: ShrunkClient) -> Response:
    """``GET /api/ticket/enabled``

    Get the help desk enabled status.

    :param netid: the NetID of the user
    :param client: the Shrunk client

    :return: the status of the help desk

    .. code-block:: json

        { "enabled": bool }

    """
    return jsonify({"enabled": client.tickets.get_help_desk_enabled()})


@bp.route("/text", methods=["GET"])
@require_login
def get_help_desk_text(
    netid: str,
    client: ShrunkClient,
) -> Response:
    """``GET /api/ticket/<reason>/text``

    Get the text-related attributes needed for messages, modals, and forms.

    :param netid: the NetID of the user
    :param client: the Shrunk client

    :return: a dictionary with the text-related attributes
    """

    return jsonify(client.tickets.get_help_desk_text())


@bp.route("/email", methods=["POST"])
@require_mail
@request_schema(HELP_DESK_EMAIL_SCHEMA)
@require_login
def send_help_desk_email(
    netid: str, client: ShrunkClient, req: Any, mail: Mail
) -> Response:
    """``POST /api/ticket/email``

    Send an email relating to a help desk ticket. This includes confirming the
    ticket was received, notifying the OSS team of a new ticket, resolving the
    ticket, and closing the ticket.

    :param netid: the NetID of the user
    :param client: the Shrunk client
    :param req: the request JSON data
    :param mail: the Flask-Mailman mail object

    :return: an empty response
    """
    # Disable route according to help desk configuration
    if (
        not client.roles.has("admin", netid)
        and not client.tickets.get_help_desk_enabled()
    ):
        abort(403)

    # Ticket does not exist
    if not client.tickets.get_ticket({"_id": req["id"]}):
        abort(404)

    client.tickets.send_help_desk_email(mail, req["id"], req["category"])
    return Response(status=200)


@bp.route("", methods=["GET"])
@require_login
def get_tickets(netid: str, client: ShrunkClient) -> Response:
    """``GET /api/ticket``

    Get all tickets for the user.

    :param netid: the NetID of the user
    :param client: the Shrunk client

    Accepts two query parameters:

    - ``filter``a comma-separated list of key-value pairs separated by colons.
        The key is the field to filter by, and the value is the value to
        filter by.
    - ``sort``: a comma-separated list of fields to sort by. Prefix a field
        with a '-' to sort in descending order.

    :return: a list of tickets
    """
    # Disable route according to help desk configuration
    if (
        not client.roles.has("admin", netid)
        and not client.tickets.get_help_desk_enabled()
    ):
        abort(403)

    # Add filter parameter
    filter_param = request.args.get("filter", None)
    query = {}
    if filter_param:
        for field in filter_param.split(","):
            key, value = field.split(":")
            query[key] = value

    # Only admins can view tickets that are not their own
    if ("reporter" not in query or query["reporter"] != netid) and not client.roles.has(
        "admin", netid
    ):
        abort(403)

    # Add sort parameter
    sort_param = request.args.get("sort", None)
    sort = []
    if sort_param:
        for field in sort_param.split(","):
            if field.startswith("-"):
                sort.append((field[1:], -1))  # Remove the '-'
            else:
                sort.append((field, 1))

    return jsonify(client.tickets.get_tickets(query, sort))


@bp.route("/<b32:id>", methods=["GET"])
@require_login
def get_ticket(netid: str, client: ShrunkClient, id: str) -> Response:
    """``GET /api/ticket/<id>``

    Get a ticket by its ID.

    :param netid: the NetID of the user
    :param client: the Shrunk client
    :param id: the ID of the ticket

    :return: the ticket
    """
    # Disable route according to help desk configuration
    if (
        not client.roles.has("admin", netid)
        and not client.tickets.get_help_desk_enabled()
    ):
        return Response(status=403)

    ticket = client.tickets.get_ticket({"_id": id})

    # Ticket does not exist
    if not ticket:
        abort(404)

    # User is not the reporter or an admin
    if ticket["reporter"] != netid and not client.roles.has("admin", netid):
        abort(403)

    return jsonify(ticket)


@bp.route("", methods=["POST"])
@request_schema(CREATE_TICKET_SCHEMA)
@require_login
def create_ticket(netid: str, client: ShrunkClient, req: Any) -> Response:
    """``POST /api/ticket``

    Create a new ticket. New tickets have certain fields set by default, such
    as the status and the time the ticket was opened.

    :param netid: the NetID of the user
    :param client: the Shrunk client
    :param req: the request JSON data

    :return: a response with a message, and the new ticket on success
    """
    # Disable route according to help desk configuration
    if (
        not client.roles.has("admin", netid)
        and not client.tickets.get_help_desk_enabled()
    ):
        abort(403)

    # Reporter has too many open tickets. For now, the hard limit is 10.
    if client.tickets.count_tickets({"reporter": netid, "status": "open"}) >= 10:
        return jsonify({"message": "Too many open tickets"}), 409

    info = {**req, "reporter": netid}

    # Set the entity to self if the reason is power_user
    if info["reason"] == "power_user":
        info["entity"] = netid

    # Duplicate open ticket already exists
    if info["reason"] in ROLE_REQUESTS and client.tickets.get_ticket(
        {
            "reason": info["reason"],
            "entity": info["entity"],
            "status": "open",
        }
    ):
        return jsonify({"message": "Duplicate ticket exists"}), 409

    # Entity already has the role
    if info["reason"] in ROLE_REQUESTS and client.roles.has(
        info["reason"], info["entity"]
    ):
        return jsonify({"message": "Already has the role"}), 409

    # Set additional ticket information
    info["status"] = "open"
    info["created_time"] = time.time()

    # Ticket can be created
    ticket = client.tickets.create_ticket(info)

    return (
        jsonify(
            {
                "message": "Ticket created successfully",
                "ticket": ticket,
            }
        ),
        201,
    )


@bp.route("/<b32:id>", methods=["PATCH"])
@request_schema(UPDATE_TICKET_SCHEMA)
@require_login
def patch_ticket(netid: str, client: ShrunkClient, req: Any, id: str) -> Response:
    """``PATCH /api/ticket/<id>``

    Update a ticket. This can be used to close or resolve a ticket. Note
    that resolving does not include the actual resolution (e.g. granting a role).

    :param netid: the NetID of the user
    :param client: the Shrunk client
    :param req: the request JSON data
    :param id: the ID of the ticket

    :return: an empty response
    """
    # Disable route according to help desk configuration
    if (
        not client.roles.has("admin", netid)
        and not client.tickets.get_help_desk_enabled()
    ):
        abort(403)

    # Ticket does not exist
    ticket = client.tickets.get_ticket({"_id": id})
    if not ticket:
        abort(404)

    # Action is close
    if req["action"] == "close":
        # Only the reporter or an admin can close the ticket
        if ticket["reporter"] != netid and not client.roles.has("admin", netid):
            abort(403)
        client.tickets.update_ticket(
            {"_id": id},
            {
                **req,
                "status": "closed",
                "actioned_time": time.time(),
            },
        )
        return jsonify({"message": "Ticket closed successfully"}), 200

    # Action is resolve
    elif req["action"] == "resolve":
        # Only an admin can resolve the ticket
        if not client.roles.has("admin", netid):
            abort(403)
        client.tickets.update_ticket(
            {"_id": id},
            {
                **req,
                "status": "resolved",
                "actioned_time": time.time(),
            },
        )
        return jsonify({"message": "Ticket resolved successfully"}), 200

    # Action is invalid
    else:
        abort(400)
