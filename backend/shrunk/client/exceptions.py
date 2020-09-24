"""Database-related exceptions."""

__all__ = ['ShrunkException', 'NoSuchObjectException', 'BadAliasException', 'BadLongURLException', 'InvalidEntity']


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
