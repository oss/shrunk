# shrunk - Rutgers University URL Shortener

"""User objects for authentication."""

from functools import wraps

from flask_login import UserMixin, current_user
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
        """Determines whether or not a user is active."""
        return not self.client.is_blacklisted(self.netid)

    def is_admin(self):
        """Determines whether or not this user is an administrator."""
        return self.client.is_admin(self.netid)

    def is_vanity(self):
        return self.client.is_admin(self.netid)

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


def admin_required(unauthorized):
    """Decorator for administrator-only actions.

    If you decorate a view with this, it will require a user to be
    authenticated, active, and an administrator before calling the actual view.

    For example ::

        @app.route('/admin')
        @admin_required
        def admin():
            # Do work...
            pass

    Note that the Flask route decoration must always be the outermost.

    :Parameters:
      - `unauthorized`: The function to call if the user is not authorized

    :Returns:
      The decorated function requiring admin privileges to execute.
    """
    def decorator_wrapper(func):
        @wraps(func)
        def decorated_view(*args, **kwargs):
            if not current_user.is_authenticated() or not current_user.is_admin():
                return unauthorized()
            return func(*args, **kwargs)
        return decorated_view
    return decorator_wrapper

def vanity_required(unauthorized):
    """Decorator for vanity-userclass-only actions.

    If you decorate a view with this, it will require a user to be
    authenticated, active, and an a vanity userclass before calling the actual
    view.

    :Parameters:
        - `unauthorized`: The function to call if the user is not authorized

    :Returns:
        The decorated function requiring vanity privileges to execute.
    """
    def decorator_wrapper(func):
        @wraps(func)
        def decorated_view(*args, **kwargs):
            if not current_user.is_authenticated() or not current_user.is_vanity():
                return unauthorized()
            return func(*args, **kwargs)
        return decorated_view
    return decorator_wrapper
