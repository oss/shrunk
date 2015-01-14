""" shRUnk - Rutgers University URL Shortener

Forms used for the application.
"""
from wtforms import Form, TextField, PasswordField, validators
from flask_auth import LoginForm

import shrunk.filters as filters


class LinkForm(Form):
    """A WTForm for creating and editing links."""
    long_url = TextField("URL", validators=[
        validators.DataRequired(),
        filters.url_reject_regex(filters.BLACKLIST)
    ])
    title = TextField("Title", validators=[validators.DataRequired()])

    def to_json(self):
        """Exports the form's fields into a JSON-compatible dictionary."""
        return {
            "long_url": self.long_url.data,
            "title": self.title.data
        }


class RULoginForm(LoginForm):
    """A WTForm representing the login form."""
    username = TextField('Netid', validators=[validators.DataRequired()])
    password = PasswordField('Password',
            validators=[validators.DataRequired()])
