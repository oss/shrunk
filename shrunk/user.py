""" shRUnk - Rutgers University URL Shortener

User object used for authentication.
"""
from flask_login import UserMixin
from flask_auth import LoginForm
from wtforms import TextField, PasswordField, validators
from shrunk.client import ShrunkClient


class User(UserMixin):
    """A User object used for logging in."""
    def __init__(self, netid):
        self.netid = netid
        self.id = netid
        self.client = ShrunkClient()

    def is_active(self):
        return not self.client.is_blacklisted(self.netid)

    def __str__(self):
      """Returns the NetID of this user."""
      return self.netid

    def __repr__(self):
      """Returns the NetID of this user."""
      return self.netid


def get_user(fields):
    """Gets a user object from fields.

    :Returns:
      A User object from the username extracted from the argument.
    """
    return User(fields['username'])
