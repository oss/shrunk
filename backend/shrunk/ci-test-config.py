"""shrunk - Rutgers University URL Shortener

Configuration options for shrunk. This is an example file; modify this and save
it as config.py.
"""

USER_WHITELIST = ["jcc", "mjw271", "peb60"]
"""These users are always permitted to login (i.e. they can't be blacklisted)
and are automatically admins."""

BANNED_REGEXES = [r"\.xxx"]

RESERVED_WORDS = ["projectnightnight", "shibboleth", "shibboleth-sp", "status"]
"""Words that cannot be used as shortened URLs. Names used as routes are automatically
disallowed, and do not need to be added to this list."""

SECURITY_MEASURES_ON = True
"""Whether the security measures are turned on or off.
You would this to be set to True when performing unit tests
or you'll fail the security tests. However, in prod it can be whatever."""

GITHUB_OUTLOOK_WEBHOOK_UPDATE_SECRET = "BLAH"
"""The secret for authenticating the webhook API for updating
the Outlook Add-In version so that only GitHub Webhooks
can make the scripts run to download new version of Outlook Add-In"""
