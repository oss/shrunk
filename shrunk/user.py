# shrunk - Rutgers University URL Shortener

"""User objects for authentication."""

from functools import wraps

from flask_login import UserMixin, current_user
from flask_auth import LoginForm
import shrunk.appserver
import shrunk.models as models
from mongoengine import DoesNotExist

''' 
    Standard user: Can log in, create links, delete their own links
    Elevated user: Standard user plus can create vanity URLs
    Administrator: Elevated user plus can view, edit, and delete links globally,
                   can ban domains, can ban and elevate or de-elevate other 
                   users
'''
USER_TYPES = {
    "standard": 0,
    "elevated": 10,
    "admin": 20
}


class User(UserMixin):
    """A User object used for logging in."""
    def __init__(self, netid):
        self.netid = netid
        self.id = netid

    def is_admin(self):
        """Determines whether or not this user is an administrator."""
        return models.User.objects.get(netid=self.netid).type == \
               USER_TYPES['admin']

    def is_elevated(self):
        """Determines whether or not this user is elevated or admin"""
        return models.User.objects.get(netid=self.netid).type >= \
               USER_TYPES['elevated']

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

def elevated_required(unauthorized):
    """Decorator for actions authorized by elevated users.

    If you decorate a view with this, it will require a user to be
    authenticated, active, and be an elevated user or higher before calling the 
    actual view.

    :Parameters:
        - `unauthorized`: The function to call if the user is not authorized

    :Returns:
        The decorated function requiring elevated privileges to execute.
    """
    def decorator_wrapper(func):
        @wraps(func)
        def decorated_view(*args, **kwargs):
            if not current_user.is_authenticated() or not current_user.is_elevated():
                return unauthorized()
            return func(*args, **kwargs)
        return decorated_view
    return decorator_wrapper

