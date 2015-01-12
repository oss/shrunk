""" shRUnk - Rutgers University URL Shortener

User object used for authentication.
"""
from flask_login import UserMixin
from flask_auth import LoginForm
from wtforms import TextField, PasswordField, validators


class User(UserMixin):
    """A User object used for logging in."""
    def __init__(self, netid):
        self.netid = netid
        self.id = netid


def get_user(fields):
    """Gets a user object from fields.

    :Returns:
      A User object from the username extracted from the argument.
    """
    return User(fields['username'])


class RULoginForm(LoginForm):
    """A WTForm representing the login form."""
    username = TextField('Netid', validators=[validators.DataRequired()])
    password = PasswordField('Password',
            validators=[validators.DataRequired()])
