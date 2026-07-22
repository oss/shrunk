"""Database-related exceptions."""

__all__ = [
    "ShrunkException",
    "NoSuchObjectException",
    "BadAliasException",
    "BadLongURLException",
    "InvalidEntity",
    "InvalidACL",
    "SecurityRiskDetected",
    "InvalidStateChange",
    "NotUserOrOrg",
    "LinkIsPendingOrRejected",
    "OrgOwnedLinkNotSupported",
    "BulkLinkValidationError",
]


class ShrunkException(Exception):
    """Base class for Shrunk exceptions."""


class NoSuchObjectException(ShrunkException):
    """Raised when the requested object does not exist."""


class BulkLinkValidationError(ShrunkException):
    """Raised when one or more links make a bulk operation invalid."""

    def __init__(self, failed_ids: list[str]):
        super().__init__("Unable to modify one or more links.")
        self.failed_ids = failed_ids


class BadAliasException(ShrunkException):
    """Raised when an alias is invalid."""


class BadLongURLException(ShrunkException):
    """Raised when a long URL is invalid."""


class InvalidEntity(ShrunkException):
    """Raised when an entity is not valid for a role."""


class InvalidACL(ShrunkException, ValueError):
    """Raised when somone tries to modify an ACL that doesn't exist"""


class SecurityRiskDetected(ShrunkException):
    """Raised when a link has been detected to be a security risk"""


class InvalidStateChange(ShrunkException):
    """
    Raised when someone changes a state of an entity incorrectly,
    perhaps from one state to another state that cannot be reached from
    previous state.
    """


class LinkIsPendingOrRejected(ShrunkException):
    """
    If a specific url is pending verification and client tries to verify,
    we don't go further and tell the user that either the link is still pending
    or it has been rejected.
    """


class NotUserOrOrg(ShrunkException, ValueError):
    """raised if a viewer was not an org or netid"""


class OrgOwnedLinkNotSupported(ShrunkException):
    """Raised when an operation that assumes a single netid owner (e.g.
    requesting edit access) is attempted on a link owned by an org."""
