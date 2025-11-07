"""Shibboleth authentication."""

from typing import Any, List

import os

from flask import current_app, session, redirect
from flask_sso import SSO
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient

__all__ = ["ext"]

ext = SSO()


@ext.login_handler
def login(user_info: Any) -> Any:
    """Get the user's attributes from shibboleth, decide whether the user
    should be allowed to access Shrunk, and possibly grant roles. The
    roles system must be initialized before this function is called."""

    client: ShrunkClient = current_app.client
    logger = current_app.logger
    types: List[str] = user_info.get("employeeType").split(";")
    netid: str = user_info.get("netid")
    twoFactorAuth = user_info.get("twoFactorAuth")
    if not twoFactorAuth and bool(int(os.getenv("SHRUNK_REQUIRE_2FA"), 0)):
        return redirect("/app")

    def t(typ: str) -> bool:  # pylint: disable=invalid-name
        return typ in types

    def log_failed(why: str) -> None:
        user_roles = user_info.get("employeeType")
        logger.info(
            f"login: failed SSO login for {netid} (roles: {user_roles}, reason: {why})"
        )

    # get info from shibboleth types
    fac_staff = t("FACULTY") or t("STAFF")
    
    

    # get info from ACLs
    is_blacklisted = client.roles.has("blacklisted", netid)
    is_whitelisted = client.roles.has("whitelisted", netid)
    is_guest = client.roles.has("guest", netid)
    is_super_admin = os.getenv("SHRUNK_SUPER_ADMIN") == netid

    # now make decisions regarding whether the user can login, and what privs they should get

    # blacklisted users can never login, except config-whitelisted users can't
    # be blacklisted (so OSS people can always login)
    if is_blacklisted and not is_super_admin:
        log_failed("blacklisted")
        abort(403)

    # config-whitelisted users are automatically made admins
    if is_super_admin:
        client.roles.grant("admin", "Justice League", netid)
        client.users.initialize_user(netid)

    # (if not blacklisted) facstaff can always login, but we need to grant a role
    # so the rest of the app knows what privs to give the user
    if fac_staff:
        client.roles.grant("facstaff", "shibboleth", netid)
        client.users.initialize_user(netid)

    if is_whitelisted or is_guest:
        client.users.initialize_user(netid)

    # now determine whether to allow login
    if not (is_super_admin or fac_staff or is_whitelisted):
        log_failed("unauthorized")
        abort(403)

    # If we get here, the user is allowed to login, and all necessary privs
    # have been granted.
    logger.debug(f"login: SSO login by {netid}")
    session["user"] = user_info
    return redirect("/app")
