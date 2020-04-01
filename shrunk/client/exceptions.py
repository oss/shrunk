# shrunk - Rutgers University URL Shortener

"""Database-related exceptions."""


class BadShortURLException(Exception):
    """Raised when the there is an error with the requested short url"""


class DuplicateIdException(BadShortURLException):
    """Raised when trying to add a duplicate key to the database."""


class ForbiddenNameException(BadShortURLException):
    """Raised when trying to use a forbidden custom short URL."""


class ForbiddenDomainException(Exception):
    """Raised when trying to make a link to a forbidden domain"""


class AuthenticationException(Exception):
    """User is not authorized to do that"""


class NoSuchLinkException(Exception):
    """Link was not found"""


class InvalidEntity(Exception):
    """Entity not valid for role"""
