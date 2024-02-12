"""Implement API endpoints under ``/api/role_request``"""

from typing import Any

from flask import Blueprint, jsonify, request, Response
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login


__all__ = ['role_request']
bp = Blueprint('role_request', __name__, url_prefix='/api/v1/role_request')

@bp.route('/<role>', methods=['GET'])
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
    if not client.roles.has('admin', netid):
        abort(403)
    return jsonify({'requests': client.role_requests.get_pending_role_requests(role)})

@bp.route('/<role>/<entity>', methods=['GET'])
@require_login
def get_pending_role_request_for_entity(netid: str, client: ShrunkClient, entity: str, role: str) -> Any:
    """``GET /api/role_request/<role>/<entity>``

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
        return jsonify({
            "message": "No pending role request found."
        }), 404
    return jsonify(client.role_requests.get_pending_role_request_for_entity(role, entity)), 200

@bp.route('', methods=['POST'])
@require_login
def request_role(netid: str, client: ShrunkClient) -> Any:
    """``POST /api/role_request/<role>/<entity>/request``

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

    Response format:
    
    .. code-block:: json
    
       { "message": "Role request submitted successfully." }
    
    """
    data = request.get_json()
    role = data.get('role')
    comment = data.get('comment')
    
    if client.role_requests.get_pending_role_request_for_entity(role, netid):
        return Response(status=400)
    client.role_requests.request_role(role, netid, comment)
    return Response(status=201)

@bp.route('/<role>/<entity>/grant', methods=['POST'])
@require_login
def grant_role_request(netid: str, client: ShrunkClient, entity: str, role: str) -> Any:
    """``POST /api/role_request/<role>/<entity>/grant``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the entity to grant the role to
        role (str): the role to grant
    
    Grant a role request. Response format:
    
    .. code-block:: json
    
       { "message": "Role request granted successfully." }
       
    """
    if not client.roles.has('admin', netid):
        abort(403)
    client.roles_request.grant_role_request(role, entity)
    return jsonify({
        "message": "Role request granted successfully."
    })

@bp.route('/<role>/<entity>/deny', methods=['POST'])
@require_login
def deny_role_request(netid: str, client: ShrunkClient, entity: str, role: str) -> Any:
    """``POST /api/role_request/<role>/<entity>/deny``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the entity to grant the role to
        role (str): the role to grant
    
    Deny a role request. Response format:
    
    .. code-block:: json
    
       { "message": "Role request denied successfully." }
       
    """
    if not client.roles.has('admin', netid):
        abort(403)
    client.role_requests.deny_role_request(role, entity)
    return jsonify({
        "message": "Role request denied successfully."
    })
    