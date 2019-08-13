# shrunk - Rutgers University URL Shortener

"""Application forms for shrunk."""

import re

from wtforms import Form, StringField, validators, ValidationError

from .filters import strip_whitespace, ensure_protocol


SHORT_URL_REGEX_VALIDATOR = validators.Regexp('^[a-zA-Z0-9_.,-]*$',
                                              message='Custom alias must consist of numbers, \
letters, and the characters ", . _ -".')


class LinkForm(Form):
    long_url = StringField('URL', filters=[strip_whitespace, ensure_protocol], validators=[
        validators.DataRequired('You need a link to shrink!'),
        validators.URL(require_tld=True, message='Please enter a valid URL.')
    ])

    title = StringField('Title', filters=[strip_whitespace], validators=[
        validators.DataRequired('Please enter a title.')
    ])

    banned_regexes = []

    def __init__(self, form, banned_regexes):
        super().__init__(form)
        self.banned_regexes = [re.compile(regex, re.IGNORECASE) for regex in banned_regexes]

    def validate_long_url(self, field):
        """ Validates the long_url field. """
        for regex in self.banned_regexes:
            if regex.search(field.data):
                raise ValidationError('That URL is not allowed.')


class AddLinkForm(LinkForm):
    short_url = StringField('Custom Alias', filters=[strip_whitespace], validators=[
        validators.Length(min=5, max=16, message="""Custom alias length must be \
between %(min)d and %(max)d characters."""),
        SHORT_URL_REGEX_VALIDATOR,
        validators.Optional(strip_whitespace=False)
    ])

    def __init__(self, form, banned_regexes):
        super().__init__(form, banned_regexes)

    def to_json(self):
        fields = ['long_url', 'title', 'short_url']
        return {field: getattr(self, field).data for field in fields}


class EditLinkForm(LinkForm):
    short_url = StringField('Custom Alias', filters=[strip_whitespace], validators=[
        validators.Length(min=5, max=16, message="""Custom alias length must be
            between %(min)d and %(max)d characters."""),
        SHORT_URL_REGEX_VALIDATOR
    ])

    old_short_url = StringField('old_short_url', validators=[validators.DataRequired()])

    def __init__(self, form, banned_regexes):
        super().__init__(form, banned_regexes)

    def to_json(self):
        """Exports the form"s fields into a JSON-compatible dictionary."""
        fields = ['long_url', 'title', 'short_url', 'old_short_url']
        return {field: getattr(self, field).data for field in fields}
