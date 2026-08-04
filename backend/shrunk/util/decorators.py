"""Decorators to be used on view functions."""

from typing import TYPE_CHECKING, Any
import functools

from flask import current_app, request, session, jsonify
from flask_mailman import Mail
from werkzeug.exceptions import abort
import jsonschema
import jsonschema.exceptions

if TYPE_CHECKING:
    from shrunk.client import ShrunkClient

__all__ = ["require_login", "request_schema"]


def require_login(func: Any) -> Any:
    """Decorator to require login via SSO."""

    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        client: "ShrunkClient" = getattr(current_app, "client")
        logger = current_app.logger
        if "user" not in session or "netid" not in session["user"]:
            logger.warning("authentication required", extra={"event_type": "security", "action": "authentication"})
            abort(401)
        netid = session["user"]["netid"]
        if client.users.has_role(netid, "blacklisted"):
            logger.warning(
                f"require_login: user {netid} is blacklisted",
                extra={"event_type": "security", "action": "authorization", "outcome": "failure"},
            )
            abort(403)
        return func(netid, client, *args, **kwargs)

    return wrapper


def require_mail(func: Any) -> Any:
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        mail: Mail = getattr(current_app, "mail")
        return func(mail, *args, **kwargs)

    return wrapper


def request_schema(schema: Any) -> Any:
    def check_body(func: Any) -> Any:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            req = request.get_json(silent=True)
            if req is None:
                abort(400)
            try:
                jsonschema.validate(req, schema, format_checker=jsonschema.draft7_format_checker)
            except jsonschema.exceptions.ValidationError:
                abort(400)
            return func(req, *args, **kwargs)

        return wrapper

    return check_body


def require_token(required_permission: str):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            client: "ShrunkClient" = getattr(current_app, "client")
            header = request.headers.get("Authorization")
            if not header:
                current_app.logger.warning(
                    "authorization header missing", extra={"event_type": "security", "action": "authentication"}
                )
                return (
                    jsonify(
                        {
                            "error": {
                                "code": "MISSING_AUTHORIZATION",
                                "message": "Authorization header is required",
                                "details": "Please provide a valid Bearer token",
                            }
                        }
                    ),
                    401,
                )

            if not header.startswith("Bearer "):
                current_app.logger.warning(
                    "authorization header invalid", extra={"event_type": "security", "action": "authentication"}
                )
                return (
                    jsonify(
                        {
                            "error": {
                                "code": "INVALID_AUTHORIZATION_FORMAT",
                                "message": "Invalid authorization format",
                                "details": "Authorization header must start with 'Bearer '",
                            }
                        }
                    ),
                    401,
                )

            # Extract and validate token
            token = header.split()[1]
            token_id = client.access_tokens.verify_token(token)
            if not token_id:
                current_app.logger.warning(
                    "access token invalid or disabled", extra={"event_type": "security", "action": "authentication"}
                )
                return (
                    jsonify(
                        {
                            "error": {
                                "code": "INVALID_TOKEN",
                                "message": "Invalid or disabled token",
                                "details": "Please provide a valid access token",
                            }
                        }
                    ),
                    401,
                )

            # Check permissions
            if not client.access_tokens.check_permissions(token_id, required_permission):
                current_app.logger.warning(
                    "access token lacks required permission",
                    extra={"event_type": "security", "action": "authorization", "outcome": "failure"},
                )
                return (
                    jsonify(
                        {
                            "error": {
                                "code": "INSUFFICIENT_PERMISSIONS",
                                "message": "Insufficient permissions",
                                "details": f"Token requires '{required_permission}' permission",
                            }
                        }
                    ),
                    403,
                )
            token_owner = client.access_tokens.get_owner(token_id)

            return func(token_owner, client, *args, **kwargs)

        return wrapper

    return decorator
