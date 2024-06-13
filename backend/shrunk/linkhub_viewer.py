from typing import Any

from flask import Blueprint, send_from_directory, make_response

__all__ = ["bp"]

bp = Blueprint(
    "linkhub_viewer",
    __name__,
    url_prefix="/h",
    static_folder="app",
    static_url_path="/app",
)


@bp.route("/", methods=["GET"])
def index() -> Any:
    return "LinkHub not found", 404


@bp.route("/<string:alias>", methods=["GET"])
def view_linkhub(alias: str) -> Any:  # type: ignore
    resp = make_response(send_from_directory("static/dist", "linkhub-loader.html"))
    return resp
