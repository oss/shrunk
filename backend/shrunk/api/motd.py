"""Implements API endpoints under ``/api/alert``"""

from typing import Any
import os

from flask import Blueprint

__all__ = ["bp"]

bp = Blueprint("motd", __name__, url_prefix="/api/core/motd")


@bp.route("", methods=["GET"])
def get_motd() -> Any:
    value = os.getenv("SHRUNK_MOTD", None)
    if value is None:
        return "", 404

    return str(value), 200
