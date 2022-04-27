"""Database-related exceptions."""

__all__ = ['ShrunkException', 'NoSuchObjectException', 'BadAliasException',
           'BadLongURLException', 'InvalidEntity', 'InvalidACL',
           'SecurityRiskDetected', 'InvalidStateChange', 'NotUserOrOrg',
           'LinkIsPendingOrRejected']


class ShrunkException(Exception):
    """Base class for Shrunk exceptions."""


class NoSuchObjectException(ShrunkException):
    """Raised when the requested object does not exist."""


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
