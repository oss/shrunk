"""Implement API endpoints under ``/api/v1/ticket``"""

from flask import Blueprint, Response, jsonify, request
from flask_mailman import Mail
from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login, require_mail
from werkzeug.exceptions import abort

__all__ = ["bp"]
bp = Blueprint("ticket", __name__, url_prefix="/api/v1/ticket")


@bp.route("/enabled", methods=["GET"])
@require_login
def get_help_desk_enabled(netid: str, client: ShrunkClient):
    """``GET /api/ticket/enabled``

    Get the help desk enabled status.

    :param netid: the NetID of the user
    :param client: the Shrunk client

    :return: the status of the help desk

    .. code-block:: json

        { "enabled": bool }

    """
    return jsonify(enabled=client.tickets.get_help_desk_enabled())


@bp.route("/text", methods=["GET"])
@require_login
def get_help_desk_text(
    netid: str,
    client: ShrunkClient,
):
    """``GET /api/ticket/<reason>/text``

    Get the text-related attributes needed for messages, modals, and forms.

    :param netid: the NetID of the user
    :param client: the Shrunk client

    :return: a dictionary with the text-related attributes
    """

    return jsonify(client.tickets.get_help_desk_text())


@bp.route("/email", methods=["POST"])
@require_mail
@require_login
def send_help_desk_email(netid: str, client: ShrunkClient, mail: Mail):
    """``POST /api/ticket/email``

    Send an email relating to a help desk ticket. This includes confirming the
    ticket was received, notifying the OSS team, and resolving the ticket.

    :param netid: the NetID of the user
    :param client: the Shrunk client
    :param mail: the Flask-Mailman mail object

    The request should include a JSON body as follows:

    .. code-block:: json

        {
            "ticketID": str,
            "category": str,
            "resolution": str (optional),
            "comment": str (optional),
        }
    """
    # Disable route according to help desk configuration
    if (
        not client.roles.has("admin", netid)
        and not client.tickets.get_help_desk_enabled()
    ):
        return abort(403)
    data = request.get_json()

    # Ticket does not exist
    if not client.tickets.get_ticket(ticket_id=data.get("ticketID")):
        return Response(status=404)

    variables = {
        "ticket_id": data.get("ticketID"),
        "category": data.get("category"),
        "resolution": data.get("resolution", None),
        "comment": data.get("comment", None),
    }

    client.tickets.send_help_desk_email(mail, **variables)
    return Response(status=200)


@bp.route("", methods=["GET"])
@require_login
def get_tickets(netid: str, client: ShrunkClient):
    """``GET /api/ticket``

    Get all tickets for the user.

    :param netid: the NetID of the user
    :param client: the Shrunk client

    Also accepts a query parameter ``sort`` formatted as
    ``?sort=reporter,-timestamp``. The default is ascending order and a `-`
    prefix indicates descending order.

    :return: a list of tickets

    .. code-block:: json

        [
            {
                "_id": int,
                "reporter": str,
                "reason": str,
                "entity": str,
                "comment": str,
                "timestamp": str,
            },
            ...
        ]

    """
    # Disable route according to help desk configuration
    if (
        not client.roles.has("admin", netid)
        and not client.tickets.get_help_desk_enabled()
    ):
        return abort(403)

    # If the user is not an admin, they can only see their own tickets. If
    # they are, they can see all tickets.
    reporter = netid if not client.roles.has("admin", netid) else None

    # Add sort parameter
    sort_param = request.args.get("sort", None)
    sort = []
    if sort_param:
        for field in sort_param.split(","):
            if field.startswith("-"):
                sort.append((field[1:], -1))  # Remove the '-'
            else:
                sort.append((field, 1))

    return jsonify(client.tickets.get_tickets(sort, reporter))


@bp.route("", methods=["POST"])
@require_login
def create_ticket(netid: str, client: ShrunkClient) -> Response:
    """``POST /api/ticket``

    Create a ticket.

    :param netid: the NetID of the user
    :param client: the Shrunk client

    The request should include a JSON body as follows:

    .. code-block:: json

        {
            "reason": str,
            "entity": str,
            "comment": str,
        }

    :return: the ticket

    .. code-block:: json

        {
            "_id": str,
            "reporter": str,
            "reason": str,
            "entity": str,
        }

    """
    # Disable route according to help desk configuration
    if not client.tickets.get_help_desk_enabled():
        return Response(status=403)

    # Reporter has too many pending tickets. For now, the hard limit is 10.
    reporter = netid

    if client.tickets.count_tickets(reporter) >= 10:
        return Response(status=429)

    data = request.get_json()
    reason = data.get("reason")
    entity = (
        data.get("entity") if reason != "power_user" else netid
    )  # Set the entity to self if the reason is power_user
    data["reporter"] = reporter

    # Duplicate ticket already exists or the user already has the role
    if (
        reason in ("power_user", "whitelisted")
        and client.tickets.get_ticket(reason=reason, entity=entity)
    ) or client.roles.has(reason, entity):
        return Response(status=409)

    # Ticket can be created
    ticket_id = client.tickets.create_ticket(data)
    ticket = client.tickets.get_ticket(ticket_id=ticket_id)

    return jsonify(ticket), 201


@bp.route("/<b32:id>", methods=["DELETE"])
@require_login
def delete_ticket(netid: str, client: ShrunkClient, id: str) -> Response:
    """``DELETE /api/ticket/<id>``

    Delete a ticket.

    :param netid: the NetID of the user
    :param client: the Shrunk client
    :param id: the ID of the ticket

    :return: an empty response

    """
    # Disable route according to help desk configuration
    if (
        not client.roles.has("admin", netid)
        and not client.tickets.get_help_desk_enabled()
    ):
        return abort(403)

    # Ticket does not exist (nothing happens, but we return 204)
    ticket = client.tickets.get_ticket(ticket_id=id)
    if not ticket:
        return Response(status=204)

    # User is not the reporter or an admin
    if ticket["reporter"] != netid and not client.roles.has("admin", netid):
        return Response(status=403)

    client.tickets.delete_ticket(id)

    return Response(status=204)
