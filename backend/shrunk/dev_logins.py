"""Development logins. We have one DEV_* user for each user class
(regular, facstaff, power user, admin)."""

from typing import Optional, Any

from flask import Blueprint, current_app, session, jsonify
from werkzeug.exceptions import abort

__all__ = ["bp"]

bp = Blueprint("devlogins", __name__, url_prefix="/api/v1/devlogins")


def mk_dev_login(netid: str, display_name: str, role: Optional[str]) -> Any:
    def view() -> Any:
        if not current_app.config.get("DEV_LOGINS"):
            current_app.logger.warning(f"failed dev login with {netid}")
            abort(403)

        current_app.logger.info(f"successful dev login with netid {netid}")
        session.update({"user": {"netid": netid, "display_name": display_name}})
        if role is not None and not current_app.client.roles.has(role, netid):
            current_app.client.roles.grant(role, "Justice League", netid)
        return jsonify({"status": "success"})

    return view


bp.add_url_rule(
    "/user", "user", mk_dev_login("DEV_USER", "Dev User", None), methods=["POST"]
)
bp.add_url_rule(
    "/facstaff",
    "facstaff",
    mk_dev_login("DEV_FACSTAFF", "Dev FacStaff", "facstaff"),
    methods=["POST"],
)
bp.add_url_rule(
    "/power",
    "power",
    mk_dev_login("DEV_PWR_USER", "Dev Power user", "power_user"),
    methods=["POST"],
)
bp.add_url_rule(
    "/admin", "admin", mk_dev_login("DEV_ADMIN", "Dev Admin", "admin"), methods=["POST"]
)
