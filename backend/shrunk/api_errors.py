"""Shared error types and response helpers for the browser-facing core API."""

from collections.abc import Mapping
from typing import Any


class ApiProblem(Exception):
    """An expected, user-actionable error returned by the core API.

    ``ApiProblem`` deliberately carries a stable machine-readable code in
    addition to a message suitable for display in the web application.  It is
    handled by the Flask app factory so individual views do not need to build
    JSON responses by hand.
    """

    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        *,
        fields: Mapping[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.fields = dict(fields) if fields else None

    def to_dict(self) -> dict[str, Any]:
        """Return the public error envelope used by ``/api/core``."""
        error: dict[str, Any] = {
            "code": self.error_code,
            "message": self.message,
        }
        if self.fields:
            error["fields"] = self.fields
        return {"error": error}


HTTP_ERROR_DETAILS: dict[int, tuple[str, str]] = {
    400: ("BAD_REQUEST", "Check the submitted information and try again."),
    401: ("AUTHENTICATION_REQUIRED", "Please sign in and try again."),
    403: ("PERMISSION_DENIED", "You do not have permission to perform this action."),
    404: ("NOT_FOUND", "The requested resource could not be found."),
    405: ("METHOD_NOT_ALLOWED", "This action is not available for this resource."),
    409: ("CONFLICT", "This request conflicts with existing data."),
    410: ("GONE", "This resource is no longer available."),
    413: ("PAYLOAD_TOO_LARGE", "The submitted data is too large."),
    415: ("UNSUPPORTED_MEDIA_TYPE", "Use a supported content type and try again."),
    422: ("UNPROCESSABLE_CONTENT", "Check the submitted information and try again."),
    429: ("RATE_LIMITED", "Too many requests were sent. Please try again shortly."),
}


def http_error_payload(status_code: int) -> dict[str, dict[str, str]]:
    """Return a safe, public payload for an HTTP error status.

    Flask's default descriptions can be HTML and may expose implementation
    details from extensions.  The browser API uses predictable messages
    instead; an unlisted 5xx status is intentionally kept generic.
    """
    error_code, message = HTTP_ERROR_DETAILS.get(
        status_code,
        (
            f"HTTP_{status_code}",
            "The server could not complete this request. Please try again.",
        ),
    )
    return {"error": {"code": error_code, "message": message}}
