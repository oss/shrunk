# shrunk - Rutgers University URL Shortener

"""Filters for data validation."""

import re

from wtforms.validators import StopValidation


BLACKLIST = [re.compile(r"^\w*(://)?[^/]*\.xxx")]
"""A sample blacklist for validating URLs.

This sample has a regular expression that rejects all links from the "xxx"
top-level domain when used with `url_reject_regex`.
"""


def url_reject_regex(regexes):
    """Rejects URLs based on regular expression rules.

    A factory function that creates a form validator. It raises a
    ValidationError if and only if the form's data matches at least one of the
    given regular expressions. (The list acts as a blacklist.)

    :Parameters:
      - `regexes`: A list of regular expression objects.

    :Returns:
      A validator function that rejects any of the regexes that have been
      specified in the argument.
    """
    def _reject(form, field):
        for regex in regexes:
            if regex.match(field.data):
                raise StopValidation("That URL is not allowed.")
    return _reject


def url_restrict_regex(regexes):
    """Restricts URLs based on regular expression rules.

    A factory function that creates a form validator. It raises a
    ValidationError if and only if the form's data matches exactly none of the
    given regular expressions.

    :Parameters:
      - `regexes`: A list of regular expression objects.

    :Returns:
      A validator function that restricts data to match the regexes specified in
      the argument.
    """
    def _restrict(form, field):
        for regex in regexes:
            if regex.match(field.data):
                break
        else:
            raise StopValidation("That URL is not allowed.")
    return _restrict


def ensure_protocol(url):
    """Fixes missing URL protocols.

    Adds an appropriate HTTP protocol to the given URL if it is missing.

    :Parameters:
      - `url`: The URL to fix

    :Returns:
      The fixed URL. If the protocol exists, it returns the original URL.
    """
    if not url.startswith("http://") and not url.startswith("https://"):
        return "http://{}".format(url)
    else:
        return url


def strip_protocol(url):
    """Strips the protocol from a URL.

    :Parameters:
      - `url`: The URL to modify

    :Returns:
      The URL without a protocol. If none exists, it returns the original URL.
    """
    return url.replace("http://", "", 1).replace("https://", "", 1)
