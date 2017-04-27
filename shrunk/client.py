# shrunk - Rutgers University URL Shortener

"""Database-level interactions for shrunk. """
import datetime
import random
import string
import time
import re
import geoip2.database
from mongoengine import DoesNotExist
from shrunk.models import BlockedDomain, Visit

"""The alphabet used for encoding short urls; several characters omitted to avoid confusion."""
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvxyz1234567890"
    
"""Randomly-generated urls must be at least 4 and at most 8 characters long.
Both these values are inclusive to match python's random methods."""
URL_MIN = len(ALPHABET) ** 3      # == 'AAAA'
URL_MAX = len(ALPHABET) ** 8 - 1  # == '00000000'

"""Reserved words that cannot be used as shortened urls."""
RESERVED_WORDS = ["add", "login", "logout", "delete", "admin"]


def visit(short_url, source_ip):
    """Visits the given URL and logs visit information.

    On visiting a URL, this is guaranteed to perform at least the following
    side effects if the URL is valid:

      - Increment the hit counter
      - Log the visitor

    If the URL is invalid, no side effects will occur.
    """
    visit = Visit(short_url=short_url, source_ip=source_ip, 
                  time=datetime.datetime.now())
    # TODO: retrieve location from geoip database
    visit.save()   


def is_blocked(url):
    """Determines if a URL has been banned.

    :Parameters:
      - `url`: The url to check

    :Returns:
      True if the url is in the blocked_urls collection; False otherwise.
    """
    base_url = url[(url.find("://") + 3):] # Strip any protocol
    base_url = base_url[: base_url.find("/")] # Strip path
    result = BlockedDomain.objects(url__startswith=base_url)
    return result.first() is not None


def generate_unique_key():
    """Generates a unique key."""
    # TODO: what if this randomly-generated key is not unique?
    return _base_encode(random.randint(URL_MIN, URL_MAX))


def _base_encode(integer):
    """Encodes an integer into our arbitrary link alphabet.

    Given an integer, convert it to base-36. Letters are case-insensitive;
    this function uses uppercase arbitrarily.

    :Parameters:
      - `integer`: An integer.

    :Returns:
      A string composed of characters from ShrunkClient.ALPHABET.
      """
    length = len(ALPHABET)
    result = []
    while integer != 0:
        result.append(ALPHABET[integer % length])
        integer //= length

    return "".join(reversed(result))
