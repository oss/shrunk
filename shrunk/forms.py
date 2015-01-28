""" shRUnk - Rutgers University URL Shortener

Forms used for the application.
"""
from wtforms import Form, TextField, PasswordField, RadioField, validators
from flask_auth import LoginForm

import shrunk.filters as filters


class LinkForm(Form):
    """A WTForm for creating and editing links."""
    long_url = TextField("URL", validators=[
        validators.DataRequired("You need a link to shrink!"),
        filters.url_reject_regex(filters.BLACKLIST)
    ])
    title = TextField("Title", validators=[
        validators.DataRequired("You need a descriptive title for the link.")])

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


class BlacklistUserForm(Form):
    """A WTForm for banning users. Accessible by admin only"""
    netid = TextField('Netid', validators=[validators.DataRequired()])
    action = RadioField('Action', choices=[('ban', 'Ban User'), ('allow',
            'Unban User')], validators=[validators.DataRequired()],
            default='ban')

    def to_json(self):
        """Exports the form's fields into a JSON-compatible dictionary."""
        return {
            "netid": self.netid.data,
            "action": self.action.data
        }

class AddAdminForm(Form):
    """A WTForm for adding new administrators. Accessible by admin only"""
    netid = TextField('Netid', validators=[validators.DataRequired()])

class BlockLinksForm(Form):
    """ A WTForm for blocking unwanted urls. Accessible by admin only"""
    link = TextField('Link', validators=[validators.DataRequired()])
    action = RadioField('Action', choices=[('block', 'Block Url'), ('allow',
            'Allow Url')], validators=[validators.DataRequired()],
            default='block')
