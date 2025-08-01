"""This module contains basic endpoints."""

# TODO: Delete this file. See https://gitlab.rutgers.edu/MaCS/OSS/shrunk/-/issues/197

from typing import Any

import os

from flask import Blueprint, current_app, render_template
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.util.decorators import require_login
from shrunk.client.exceptions import NoSuchObjectException

__all__ = ["bp"]

bp = Blueprint("shrunk", __name__, url_prefix="/api/core")


@bp.route("/access_request/<hex_token:token>/accept", methods=["GET"])
@require_login
def accept_access_request(netid: str, client: ShrunkClient, token: bytes) -> Any:
    try:
        if not client.roles.has(
            "admin", netid
        ) and not client.links.check_access_request_permission(token, netid):
            abort(403)
    except NoSuchObjectException:
        abort(404)
    client.links.accept_access_request(token)
    enable_dev = bool(int(os.getenv("SHRUNK_DEV_LOGINS", 0)))
    return render_template(
        "access_request_resolved.html",
        message="The access request has been granted.",
        dev=enable_dev,
    )


@bp.route("/access_request/<hex_token:token>/deny", methods=["GET"])
@require_login
def deny_access_request(netid: str, client: ShrunkClient, token: bytes) -> Any:
    try:
        if not client.roles.has(
            "admin", netid
        ) and not client.links.check_access_request_permission(token, netid):
            abort(403)
    except NoSuchObjectException:
        abort(404)
    client.links.deny_access_request(token)
    enable_dev = bool(int(os.getenv("SHRUNK_DEV_LOGINS", 0)))
    return render_template(
        "access_request_resolved.html",
        message="The access request has been denied.",
        dev=enable_dev,
    )
