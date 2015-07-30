""" shRUnk - Rutgers University URL Shortener

Forms used for the application.
"""
import re

from wtforms import Form, TextField, PasswordField, RadioField, validators
from flask_auth import LoginForm

import shrunk.filters


class LinkForm(Form):
    """A WTForm for creating and editing links."""
    long_url = TextField("URL", validators=[
        validators.DataRequired("You need a link to shrink!"),
        validators.URL(require_tld=True, message="Please enter a valid URL.")
    ])
    title = TextField("Title", validators=[
        validators.DataRequired("Please enter a title.")
    ])
    rejected_regexes = []

    def __init__(self, form, banlist=None):
        """Initializes the form.

        :Parameters:
          - `form`: The form from an incoming request
          - `banlist` (optional): A list of strings to restrict, in addition to
            the default ones
        """
        super().__init__(form)
        if banlist:
            for r in banlist:
                LinkForm.rejected_regexes.append(re.compile(r))

    def validate_long_url(form, field):
        for regex in LinkForm.rejected_regexes:
            if regex.search(field.data):
                raise ValidationError("That URL is not allowed.")

    def to_json(self):
        """Exports the form"s fields into a JSON-compatible dictionary."""
        return {
            "long_url": self.long_url.data,
            "title": self.title.data
        }


class RULoginForm(LoginForm):
    """A WTForm representing the login form."""
    username = TextField("Netid", validators=[validators.DataRequired()])
    password = PasswordField("Password",
            validators=[validators.DataRequired()])


class BlacklistUserForm(Form):
    """A WTForm for banning users. Accessible by admin only"""
    netid = TextField("Netid", validators=[validators.DataRequired()])
    action = RadioField("Action", choices=[("ban", "Ban User"), ("allow",
            "Unban User")], validators=[validators.DataRequired()],
            default="ban")

    def to_json(self):
        """Exports the form's fields into a JSON-compatible dictionary."""
        return {
            "netid": self.netid.data,
            "action": self.action.data
        }


class AddAdminForm(Form):
    """A WTForm for adding new administrators. Accessible by admin only"""
    netid = TextField("NetID", validators=[validators.DataRequired()])


class BlockLinksForm(Form):
    """ A WTForm for blocking unwanted urls. Accessible by admin only"""
    link = TextField("Link", validators=[validators.DataRequired()])
