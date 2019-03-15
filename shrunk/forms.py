# shrunk - Rutgers University URL Shortener

"""Application forms for shrunk."""

import re

from wtforms import Form, TextField, validators, ValidationError

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

    def __init__(self, form, banned_regexes):
        """Initializes the form.

        :Parameters:
          - `form`: The form from an incoming request
          - `banlist` (optional): A list of strings to restrict, in addition to
            the default ones
        """
        super(LinkForm, self).__init__(form)
        if banned_regexes:
            for regex in banned_regexes:
                LinkForm.rejected_regexes.append(re.compile(regex, re.IGNORECASE))

    def validate_long_url(self, field):
        """Performs validation on the long_url field."""
        for regex in LinkForm.rejected_regexes:
            if regex.search(field.data):
                raise ValidationError("That URL is not allowed.")

    def validate_short_url(self, field):
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
