# shrunk - Rutgers University URL Shortener

"""Application forms for shrunk."""

import re

from wtforms import Form, TextField, BooleanField, PasswordField, RadioField, SelectField, validators, ValidationError
from flask_auth import LoginForm
from shrunk.user import USER_TYPES

import shrunk.filters

class LinkForm(Form):
    """A WTForm for creating and editing links.

    :Fields:
      - `long_url`: Text field for the original unshrunk URL
      - `title`: Text field for a descriptive link title
    """
    long_url = TextField("URL", validators=[
        validators.DataRequired("You need a link to shrink!"),
        validators.URL(require_tld=True, message="Please enter a valid URL.")
    ])
    title = TextField("Title", validators=[
        validators.DataRequired("Please enter a title.")
    ])
    short_url = TextField("Custom Alias", validators=[
        validators.Length(min=5, max=16, message="""Custom alias length must be
            between %(min)d and %(max)d characters."""),
        validators.Optional(strip_whitespace=False)
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
        """Performs validation on the long_url field."""
        for regex in LinkForm.rejected_regexes:
            if regex.search(field.data):
                raise ValidationError("That URL is not allowed.")

    def validate_short_url(form, field):
        """Performs validation on the short_url field."""
        if not field.data.isalnum():
            raise ValidationError('Custom alias must be alphanumeric.')

    def to_json(self):
        """Exports the form"s fields into a JSON-compatible dictionary."""
        data = {
            "long_url": self.long_url.data,
            "title": self.title.data,
        }
        if self.short_url.data:
            data["short_url"] = self.short_url.data
        return data


class RULoginForm(LoginForm):
    """A WTForm representing the login form.

    :Fields:
      - `username`: Text field for the user's NetID
      - `password`: Password field for a NetID password
    """
    username = TextField("Netid", validators=[
        validators.DataRequired(message="Please provide your NetID.")])
    password = PasswordField("Password", validators=[
        validators.DataRequired(message="Please provide a password.")])


class BlacklistUserForm(Form):
    """A WTForm for banning users.

    This form is accessible by administrators only.

    :Fields:
      - `netid`: Text field corresponding to the banned user's NetID
    """
    netid = TextField("NetID", validators=[validators.DataRequired()])

    def to_json(self):
        """Exports the form's fields into a JSON-compatible dictionary."""
        return {
            "netid": self.netid.data,
            "action": self.action.data
        }


class UserForm(Form):
    """A WTForm for adding new users.
    
    This form is accessible by administrators only.

    :Fields:
      - `netid`: Text field corresponding to a NetID
    """
    netid = TextField("NetID", validators=[validators.DataRequired()])
    type = SelectField("User type", coerce=int, choices=[
                           (USER_TYPES['standard'], "Standard user"), 
                           (USER_TYPES['elevated'], "Elevated user"),
                           (USER_TYPES['admin'], "Administrator")
                       ])

    def to_json(self):
        """Exports the form's fields into a JSON-compatible dictionary."""
        return {
            "netid": self.netid.data,
            "flags": {
                "A": self.admin.data,
                "V": self.vanity.data
            }
        }


class BlockLinksForm(Form):
    """A WTForm for blocking unwanted URLs.

    This form is accessible by administrators only.

    :Fields:
      - `link`: Text field corresponding to a long URL to block
    """
    link = TextField("Link", validators=[validators.DataRequired()])
