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
              "role": str,
              "entity": str,
              "comment": str,
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

       { "role": str,
          "entity": str,
          "comment": str,
          "time_requested": DateTime,
        }
    """
    result = client.role_requests.get_pending_role_request_for_entity(role, entity)
    if not result:
        return Response(status=204)
    return (
        jsonify(result),
        200,
    )


@bp.route("", methods=["POST"])
@require_mail
@require_login
def make_role_request(netid: str, client: ShrunkClient, mail: Mail) -> Any:
    """``POST /api/role_request``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object

    Make a role request as the entity requesting the role.

    The request should include a JSON body with the following format:

    .. code-block:: json

       {
           "role": str,
           "comment": str
       }
    """
    data = request.get_json()
    role = data.get("role")
    comment = data.get("comment")

    # If the user already has a pending role request for the given role, return 409
    if client.role_requests.get_pending_role_request_for_entity(role, netid):
        return Response(status=409)
    
    # Otherwise, create the request. It should return 201
    client.role_requests.create_role_request(role, netid, comment)
    
    # If emails are toggled on, a confirmation email will be sent to the user and a notification email will be sent
    # to the OSS team. The notification email will be overriden by a slack notification if slack integration is on.
    if client.role_requests.get_send_mail_on():
        client.role_requests.send_role_request_confirmation_mail(role, netid, mail)
        if client.role_requests.get_slack_integration_on():
            client.role_requests.send_role_request_notification_slack(role, netid)
        else:
            client.role_requests.send_role_request_notification_mail(role, netid, mail)
    else:
        if client.role_requests.get_slack_integration_on():
            client.role_requests.send_role_request_notification_slack(role, netid)
        
    return Response(status=201)


# Approving role requests can be done via the Role API (see backend/shrunk/api/role.py)

@bp.route("approve", methods=["POST"])
@require_mail
@require_login
def approve_role_request(netid: str, client: ShrunkClient, mail: Mail) -> Any:
    """``POST /api/role_request/approve``
    
    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the entity to approve the role to
        role (str): the role to approve
        
    Approve a role request by granting the role, then deleting it.
    
    The request should include a JSON body with the following format:
    
    .. code-block:: json

       {
           "role": str,
           "entity": str,
           "comment": str
       }
    """
    data = request.get_json()
    role = data.get("role")
    entity = data.get("entity")
    comment = data.get("comment")
    
    # If the user does not have the admin role, return 403
    if not client.roles.has("admin", netid):
        abort(403)
      
    # If there is not a pending role request from the user for this role, return 404  
    if not client.role_requests.get_pending_role_request_for_entity(role, entity):
        return Response(status=404)
    
    # Otherwise, grant the role and delete the request
    client.roles.grant(role, netid, entity, comment)
    
    # If slack integration is toggled on, delete the request message from Slack
    if client.role_requests.get_slack_integration_on():
        client.role_requests.delete_role_request_notification_slack(role, entity, True)
    
    client.role_requests.delete_role_request(role, entity)
    
    # If emails are toggled on, a denial email will be sent to the user
    if client.role_requests.get_send_mail_on():
        client.role_requests.send_role_request_approval_mail(role, netid, comment, mail)
    
    return Response(status=200)
    
    
    


@bp.route("deny", methods=["DELETE"])
@require_mail
@require_login
def deny_role_request(netid: str, client: ShrunkClient, mail: Mail) -> Any:
    """``DELETE /api/role_request/deny``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the entity to approve the role to
        role (str): the role to approve

    Deny a role request by deleting it without granting.

    The request should include a JSON body with the following format:

    .. code-block:: json

       {
           "role": str,
           "entity": str,
           "comment": str"
       }
    """
    data = request.get_json()
    role = data.get("role")
    entity = data.get("entity")
    comment = data.get("comment")

    # If the user does not have the admin role, return 403
    if not client.roles.has("admin", netid):
        abort(403)
      
    # If there is not a pending role request from the user for this role, return 404  
    if not client.role_requests.get_pending_role_request_for_entity(role, entity):
        return Response(status=404)
    
    # If slack integration is toggled on, delete the request message from Slack
    if client.role_requests.get_slack_integration_on():
        client.role_requests.delete_role_request_notification_slack(role, entity, False)
    
    # Otherwise, delete the request. It should return 204
    client.role_requests.delete_role_request(role, entity)
    
    
    # If emails are toggled on, a denial email will be sent to the user
    if client.role_requests.get_send_mail_on():
        client.role_requests.send_role_request_denial_mail(role, entity, comment, mail)
    
    return Response(status=204)


@bp.route("/<role_name>/request-text", methods=["GET"])
@require_login
def get_role_request_text(netid: str, client: ShrunkClient, role_name: str) -> Any:
    """``GET /api/role_request/<role_name>/request-text``

    Get the request-text for a role. Response format:

    .. code-block:: json

       { "text": Dict[str, str] }

    For the format of the role request text, see :py:mod:`shrunk.client.roles`.

    :param netid:
    :param client:
    :param role_name:
    """
    text = client.role_requests.get_role_request_text(role_name)
    return jsonify({"text": text})


@bp.route("/position/<b32:entity>", methods=["GET"])
@require_login
def get_position_info(netid: str, client: ShrunkClient, entity: str) -> Any:
    """``GET /api/role_request/position/<b32:entity>``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the netid of the user to get position info for

    Get the position info for a user needed to make role request decisions. Response format:

    .. code-block:: json

       {
           "uid": List[str],
           "rutgersEduStaffDepartment": List[str],
           "title": List[str],
           "employeeType": List[str],
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
