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
    return jsonify({'requests': client.role_requests.get_pending_role_requests(role)}), 200

@bp.route('/<role>/count', methods=['GET'])
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
    if not client.roles.has('admin', netid):
        abort(403)
    return jsonify({'count': client.role_requests.get_pending_role_requests_count(role)}), 200

@bp.route('/<role>/<b32:entity>', methods=['GET'])
@require_login
def get_pending_role_request_for_entity(netid: str, client: ShrunkClient, entity: str, role: str) -> Any:
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
    return jsonify(client.role_requests.get_pending_role_request_for_entity(role, entity)), 200

@bp.route('', methods=['POST'])
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
    role = data.get('role')
    comment = data.get('comment')
    
    if client.role_requests.get_pending_role_request_for_entity(role, netid):
        return Response(status=409)
    client.role_requests.request_role(role, netid, comment)
    return Response(status=201)

# Granting role requests can be done via the Role API (see backend/shrunk/api/role.py)

@bp.route('', methods=['DELETE'])
@require_login
def delete_role_request(netid: str, client: ShrunkClient) -> Any:
    """``DELETE /api/role_request``

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the entity to grant the role to
        role (str): the role to grant
    
    Delete a role request. Granted if granted is true, otherwise denied.
    
    The request should include a JSON body with the following format:

    .. code-block:: json

       {
           "role": "<role>",
           "entity": "<entity>",
           "comment": "<comment>"
           "granted": true/false
       }
    """
    data = request.get_json()
    role = data.get('role')
    entity = data.get('entity')
    comment = data.get('comment')
    granted = data.get('granted')
    
    if not client.roles.has('admin', netid):
        abort(403)
    if not client.role_requests.get_pending_role_request_for_entity(role, entity):
        return Response(status=404)
    client.role_requests.delete_role_request(role, entity, granted)
    return Response(status=204)

@bp.route('/<role_name>/request-text', methods=['GET'])
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
    text = client.role_requests.get_request_text(role_name)
    return jsonify({'text': text})
    