"""Decorators to be used on view functions."""

from typing import Any
import functools

from flask import current_app, request, session, jsonify
from flask_mailman import Mail
from werkzeug.exceptions import abort
import jsonschema

__all__ = ["require_login", "request_schema"]


def require_login(func: Any) -> Any:
    """Decorator to require login via SSO."""

    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        client = current_app.client
        logger = current_app.logger
        if "user" not in session or "netid" not in session["user"]:
            logger.debug("require_login: user not logged in")
            abort(401)
        netid = session["user"]["netid"]
        if client.roles.has("blacklisted", netid):
            logger.warning(f"require_login: user {netid} is blacklisted")
            abort(403)
        return func(netid, client, *args, **kwargs)

    return wrapper


def require_mail(func: Any) -> Any:
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        mail: Mail = current_app.mail
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
                jsonschema.validate(
                    req, schema, format_checker=jsonschema.draft7_format_checker
                )
            except jsonschema.exceptions.ValidationError:
                abort(400)
            return func(req, *args, **kwargs)

        return wrapper

    return check_body


def require_token(required_permisson: str):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            client = current_app.client
            header = request.headers.get("Authorization")
            if not header:
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
            if not client.access_tokens.check_permissions(token_id, required_permisson):
                return (
                    jsonify(
                        {
                            "error": {
                                "code": "INSUFFICIENT_PERMISSIONS",
                                "message": "Insufficient permissions",
                                "details": f"Token requires '{required_permisson}' permission",
                            }
                        }
                    ),
                    403,
                )

            return func(client, *args, **kwargs)

        return wrapper

    return decorator
