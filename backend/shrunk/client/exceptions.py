"""Database-related exceptions."""

__all__ = ['ShrunkException', 'NoSuchObjectException', 'BadAliasException', 'BadLongURLException', 'InvalidEntity', 'InvalidACL']


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

class NotUserOrOrg(shrunkException, ValueError):
    """raised if a viewer was not an org or netid"""
