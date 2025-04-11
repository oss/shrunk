"""Implement API endpoints under ``/api/user``"""

from typing import Any, Dict
import os

from flask import Blueprint, jsonify, request, session, current_app
from shrunk.client.exceptions import InvalidEntity, NoSuchObjectException
from werkzeug.exceptions import abort
from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login

__all__ = ["bp"]
bp = Blueprint("user", __name__, url_prefix="/api/core/user")


@bp.route("", methods=["POST"])
@require_login
def create_user(netid: str, client: ShrunkClient) -> Any:
    """POST /api/core/user

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object

    Creates a new user in the system.

    Request format:
    .. code-block:: json

        { "netid": str,
            "roles": [str, ...],}

    """

    if not client.users.has_role(netid, "admin"):
        abort(403)

    data = request.get_json()
    new_user_netid = data.get("netid")
    if not new_user_netid or not client.users.is_valid_entity(new_user_netid):
        abort(400)
    roles = data.get("roles", [])

    new_user = client.users.get_user(new_user_netid)
    if new_user is not None:
        abort(400)

    client.users.initialize_user(new_user_netid, roles, netid)
    return "", 204


@bp.route("", methods=["DELETE"])
@require_login
def delete_user(netid: str, client: ShrunkClient) -> Any:
    """DELETE /api/core/user


    Args:
        netid (str): _description_
        client (ShrunkClient): _description_

    Deletes a user in the system.
    Request format:
    .. code-block:: json

        { "netid": str }

    """
    if not client.users.has_role(netid, "admin"):
        abort(403)

    data = request.get_json()
    netid = data.get("netid")
    if not netid:
        abort(400)
    try:
        client.users.delete_user(netid)
    except NoSuchObjectException:
        abort(404)
    return "", 204


@bp.route("/roles", methods=["PATCH"])
@require_login
def add_user_role(netid: str, client: ShrunkClient) -> Any:
    """PATCH /api/core/user/roles

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object

    Updates the roles of a user.

    Request format:
    .. code-block:: json
        {
            "netid": str,
            "role" : str,
            "comment": str

        }



    """
    if not client.users.has_role(netid, "admin"):
        abort(403)

    data = request.get_json()
    grantee = data.get("netid")
    role = data.get("role")
    comment = data.get("comment")

    if not grantee or not role:
        abort(400)
    if not client.users.is_valid_entity(grantee):
        abort(400)
    try:
        client.users.grant_role(netid, grantee, role, comment)
    except NoSuchObjectException as e:
        abort(400)
    except InvalidEntity as e:
        abort(403)
    return "", 204


@bp.route("/roles", methods=["DELETE"])
@require_login
def remove_user_role(netid: str, client: ShrunkClient) -> Any:
    """DELETE /api/core/user/roles

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object

    Removes a role from a user.

    Request format:
    .. code-block:: json

        { "netid": str,
            "role": str }

    """
    if not client.users.has_role(netid, "admin"):
        abort(403)
    data = request.get_json()
    grantee = data.get("netid")
    role = data.get("role")

    if not grantee or not role:
        abort(400)

    try:
        client.users.revoke_role(netid, grantee, role)
    except NoSuchObjectException:
        abort(404)
    except InvalidEntity:
        abort(403)
    return "", 204


@bp.route("/all", methods=["POST"])
@require_login
def get_all_users(netid: str, client: ShrunkClient) -> Dict[Any, Any]:
    """POST /api/core/user/all

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object

    Obtains all users in the system.

    Request format:
    .. code-block:: json

    {
        "operations": [
            {
                "type": "str",
                "field": "str",
                "specification": "str",
                "filterString": "str",
            },
            ...
        ]
    }

    Response format:

    .. code-block:: json

        { "users": [{
                "netid": str,
                "organizations": [str, ...],
                "roles": [str, ...],
                "linksCreated": int,
            }, ...]
        }

    """
    if not client.users.has_role(netid, "admin"):
        abort(403)

    data = request.get_json()
    if data is None:
        abort(400)
    operations = data.get("operations", [])
    users = client.users.get_all_users(operations)
    if users is None:
        abort(404)
    return jsonify({"users": users})


@bp.route("/options", methods=["GET"])
@require_login
def get_user_system_options(netid: str, client: ShrunkClient) -> Dict[Any, Any]:
    """GET /api/core/user/options

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object

    Obtains options related to the shrunk user system.

    Response format:

    """
    if not client.users.has_role(netid, "admin"):
        abort(403)
    options = client.users.get_user_system_options()
    if options is None:
        abort(410)
    return jsonify({"options": options})


@bp.route("/info")
def get_user_info():
    """GET /api/core/user/info

    Get current user info from session"""
    if "user" not in session:
        return jsonify({"netid": "", "privileges": []})

    user = session["user"]
    client = current_app.client
    netid = user.get("netid", "")
    user_data = client.users.get_user(netid)

    return jsonify(
        {
            "netid": netid,
            "privileges": user_data.get("roles", []),
            "motd": os.getenv("SHRUNK_MOTD", None),
            "filterOptions": user_data.get("filterOptions", {}),
        }
    )


@bp.route("/<b32:entity>/valid", methods=["GET"])
@require_login
def is_valid_entity(netid: str, client: ShrunkClient, entity: str) -> Any:
    """GET /api/core/user/<b32:entity>/valid

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the entity to check

    Check whether an entity is a valid netid.

    Response format:

    .. code-block:: json

        { "valid": bool }

    """
    return jsonify({"valid": client.users.is_valid_entity(entity)})


@bp.route("/<b32:entity>/position", methods=["GET"])
@require_login
def get_position_info(netid: str, client: ShrunkClient, entity: str) -> Any:
    """GET /api/core/user/<b32:entity>/position

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        entity (str): the entity to get position info for

    Get the position info for a user. Response format:

    .. code-block:: json

       {
            "titles": List[str],
            "departments": List[str],
            "employmentTypes": List[str]
        }
    """
    if not client.users.has_role(netid, "admin"):
        abort(403)
    return jsonify(client.users.get_position_info(entity))


@bp.route("/options/filter", methods=["PATCH"])
@require_login
def update_user_options(
    netid: str,
    client: ShrunkClient,
) -> Any:
    """PATCH /api/core/user/options/filter

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object





    """

    data = request.get_json()
    filterOptions = data.get("filterOptions")

    if filterOptions is None:
        abort(400)

    try:
        client.users.update_user_filter_options(netid, filterOptions)
    except ValueError:
        abort(400)
    return "", 204


@bp.route("<user>", methods=["GET"])
@require_login
def get_user(netid: str, client: ShrunkClient, user: str) -> Any:
    """GET /api/core/user/<user>

    Args:
        netid (str): the netid of the user logged in
        client (ShrunkClient): the client object
        user (str): the netid of the user to get information for

    Obtains information about a user in the system.

    Response format:

    .. code-block:: json

        { "netid": str,
            "organizations": [str, ...],
            "roles": [str, ...],
            "linksCreated": int,
    """
    if not client.users.has_role(netid, "admin"):
        abort(403)
    if not client.users.is_valid_entity(user):
        abort(400)
    user_data = client.users.get_user(user)
    if user_data is None:
        abort(404)
    return jsonify(
        {
            "netid": user,
            "organizations": user_data["organizations"],
            "roles": user_data["roles"],
            "linksCreated": user_data["linksCreated"],
        }
    )
