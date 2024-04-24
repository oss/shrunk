"""Implement API endpoints under ``/api/role_request``"""

from typing import Any

from flask import Blueprint, jsonify, request, Response, current_app
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login, require_mail, require_api_key
from shrunk.util.ldap import query_position_info

from flask_mailman import Mail


__all__ = ["role_request"]
bp = Blueprint("role_request", __name__, url_prefix="/api/v1/role_request")


@bp.route("/<role>", methods=["GET"])
@require_login
def get_pending_role_requests(netid: str, client: ShrunkClient, role: str) -> Any:
    """``GET /api/role_request/<role>``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        role (str): the role to get pending requests for

    Obtains all pending role requests for a role. Response format:

    .. code-block:: json

       { "requests": [{
              "role": "string",
              "entity": "string",
              "comment": "string",
              "time_requested": DateTime,
            }, ...]
       }

    """
    if not client.roles.has("admin", netid):
        abort(403)
    return (
        jsonify({"requests": client.role_requests.get_pending_role_requests(role)}),
        200,
    )


@bp.route("/<role>/count", methods=["GET"])
@require_login
def get_pending_role_requests_count(netid: str, client: ShrunkClient, role: str) -> Any:
    """``GET /api/role_request/<role>/count``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        role (str): the role to get pending requests count for

    Obtains the count of all pending role requests. Response format:

    .. code-block:: json

       { "count": int }
    """
    if not client.roles.has("admin", netid):
        abort(403)
    return (
        jsonify({"count": client.role_requests.get_pending_role_requests_count(role)}),
        200,
    )


@bp.route("/<role>/<b32:entity>", methods=["GET"])
@require_login
def get_pending_role_request_for_entity(
    netid: str, client: ShrunkClient, entity: str, role: str
) -> Any:
    """``GET /api/role_request/<role>/<b32:entity>``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the entity to get the pending role request for
        role (str): the role to get the pending request for

    Obtains a single pending role request for a role and entity. Response format:

    .. code-block:: json

       { "role": "string",
          "entity": "string",
          "comment": "string",
          "time_requested": DateTime,
        }
    """
    result = client.role_requests.get_pending_role_request_for_entity(role, entity)
    if not result:
        return Response(status=204)
    return (
        jsonify(client.role_requests.get_pending_role_request_for_entity(role, entity)),
        200,
    )


@bp.route("", methods=["POST"])
@require_login
def request_role(netid: str, client: ShrunkClient) -> Any:
    """``POST /api/role_request``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object

    Request a role for an entity.

    The request should include a JSON body with the following format:

    .. code-block:: json

       {
           "role": "<role>",
           "comment": "<comment>"
       }
    """
    data = request.get_json()
    role = data.get("role")
    comment = data.get("comment")

    if client.role_requests.get_pending_role_request_for_entity(role, netid):
        return Response(status=409)
    client.role_requests.request_role(role, netid, comment)
    return Response(status=201)


# Approving role requests can be done via the Role API (see backend/shrunk/api/role.py)


@bp.route("", methods=["DELETE"])
@require_login
def delete_role_request(netid: str, client: ShrunkClient) -> Any:
    """``DELETE /api/role_request``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the entity to approve the role to
        role (str): the role to approve

    Delete a role request.

    The request should include a JSON body with the following format:

    .. code-block:: json

       {
           "role": "<role>",
           "entity": "<entity>",
       }
    """
    data = request.get_json()
    role = data.get("role")
    entity = data.get("entity")

    if not client.roles.has("admin", netid):
        abort(403)
    if not client.role_requests.get_pending_role_request_for_entity(role, entity):
        return Response(status=404)
    client.role_requests.delete_role_request(role, entity)
    return Response(status=204)


@bp.route("/<role_name>/request-text", methods=["GET"])
@require_login
def get_role_request_text(netid: str, client: ShrunkClient, role_name: str) -> Any:
    """``GET /api/role_request/<role_name>/request-text``

    Get the request-text for a role. Response format:

    .. code-block:: json

       { "text": "role-request-text" }

    For the format of the role request text, see :py:mod:`shrunk.client.roles`.

    :param netid:
    :param client:
    :param role_name:
    """
    text = client.role_requests.get_role_request_text(role_name)
    return jsonify({"text": text})


@bp.route("/confirmation", methods=["POST"])
@require_mail
@require_login
def confirm_role_request(netid: str, client: ShrunkClient, mail: Mail) -> Any:
    """``POST /api/role_request/confirmation``

    Send an email to the requesting-user confirming that a role request has been sent to be manually processed.

    The request should include a JSON body with the following format:

    .. code-block:: json

       {"role_name": "<role_name>"}

    :param netid: the netid of the user logged in
    :param client: the client object
    :param mail: the mail object
    """
    data = request.get_json()
    role_name = data.get("role_name")

    if not client.role_requests.get_pending_role_request_for_entity(role_name, netid):
        return Response(status=404)
    
    if client.role_requests.get_send_mail_on():
        client.role_requests.send_role_request_confirmation_mail(netid, mail, role_name)
        client.role_requests.send_role_request_notify_mail(netid, mail, role_name)
        
    if client.role_requests.get_slack_integration_on():
        client.role_requests.send_role_request_notify_slack(netid, role_name)
    return Response(status=200)


@bp.route("/approval", methods=["POST"])
@require_mail
@require_login
def send_role_request_approval(netid: str, client: ShrunkClient, mail: Mail) -> Any:
    """``POST /api/role_request/approval``

    Send an email to the requesting-user confirming that their role request is approved.

    The request should include a JSON body with the following format:

    .. code-block:: json

       {
           "role_name": "<role_name>"
           "entity": "<entity>"
           "comment": "<comment>"
       }

    :param netid: the netid of the user logged in
    :param client: the client object
    :param mail: the mail object
    """
    data = request.get_json()
    role_name = data.get("role_name")
    entity = data.get("entity")
    comment = data.get("comment")

    if not comment or comment == "":
        comment = "none"

    if not client.roles.has("admin", netid):
        return Response(status=403)
    if client.role_requests.get_send_mail_on():
        client.role_requests.send_role_request_approval_mail(entity, mail, role_name, comment)
    return Response(status=200)


@bp.route("/denial", methods=["POST"])
@require_mail
@require_login
def send_role_request_denial(netid: str, client: ShrunkClient, mail: Mail) -> Any:
    """``POST /api/role_request/approval``

    Send an email to the requesting-user confirming that their role request is approved.

    The request should include a JSON body with the following format:

    .. code-block:: json

       {
           "role_name": "<role_name>"
           "entity": "<entity>"
           "comment": "<comment>"
       }

    :param netid: the netid of the user logged in
    :param client: the client object
    :param mail: the mail object
    """
    data = request.get_json()
    role_name = data.get("role_name")
    entity = data.get("entity")
    comment = data.get("comment")

    if not comment or comment == "":
        comment = "none"

    if not client.roles.has("admin", netid):
        return Response(status=403)
    if client.role_requests.get_send_mail_on():
        client.role_requests.send_role_request_denial_mail(entity, mail, role_name, comment)
    return Response(status=200)


@bp.route("/position/<b32:entity>", methods=["GET"])
@require_login
def get_position_info(netid: str, client: ShrunkClient, entity: str) -> Any:
    """``GET /api/role_request/position/<b32:entity>``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the netid of the user to get position info for

    Get the position info for a user. Response format:

    .. code-block:: json

       {
           "uid": "List[str]",
           "rutgersEduStaffDepartment": "List[str]",
           "title": "List[str]",
           "employeeType": "List[str]",
       }
    """
    if not client.roles.has("admin", netid):
        abort(403)
    return jsonify(query_position_info(entity))

@bp.route("/send_mail_on", methods=["GET"])
@require_login
def get_send_mail_on(netid: str, client: ShrunkClient) -> Any:
    """``GET /api/role_request/send_mail_on``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object

    Get the status of the send_mail_on flag. Response format:

    .. code-block:: json

       { "send_mail_on": bool }
    """
    return jsonify({"send_mail_on": client.role_requests.get_send_mail_on()})

@bp.route("/slack/<role>/count", methods=["GET"])
@require_api_key
def get_pending_role_requests_count_slack(role: str) -> Any:
    """``GET /api/role_request/slack/<role>/count``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        role (str): the role to get pending requests count for

    Duplicate of ``GET /api/role_request/<role>/count`` but for slack integration. Response format:

    .. code-block:: json

       { "count": int }
    """
    client = current_app.client
    return (
        jsonify({"count": client.role_requests.get_pending_role_requests_count(role)}),
        200,
    )
