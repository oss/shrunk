from typing import Any

from flask import Blueprint, current_app, jsonify
from pymongo.errors import PyMongoError

__all__ = ["bp"]

bp = Blueprint("health", __name__, url_prefix="/api/core")


@bp.route("/health", methods=["GET"])
def health() -> Any:
    """``GET /api/core/health``

    returns 200 without login and without a database connection
    """
    return jsonify({}), 200


@bp.route("/ready", methods=["GET"])
def ready() -> Any:
    """``GET /api/core/ready``

    returns 200 with MongoDB up and 503 with mongodb unreachable

    """
    try:
        current_app.client.db.command("ping")
    except PyMongoError:
        return jsonify({}), 503

    return jsonify({}), 200
