""" shrunk - Rutgers University URL Shortener

Configuration options for shrunk. This is an example file; modify this and save
it as config.py.
"""

DB_HOST = 'mongo'
"""The host machine for the database."""

DB_PORT = 27017
"""The database's port on the host machine."""

DB_NAME = 'shrunk_test'

GEOLITE_PATH = '/usr/share/GeoIP/GeoLite2-City.mmdb'
"""The path to the geolite geoip database."""

SECRET_KEY = 'something_secret'
"""A secret key for Flask."""

SHRUNK_URL = 'http://localhost:6000'
"""The public URL for shrunk."""

LINKSERVER_URL = 'http://localhost:6000'
"""The public URL for the link server."""

DUAL_SERVER = False
"""Determines whether or not the web application server doubles as the link
server. The default setting is False, which assumes that a separate server
handles the links."""

USER_WHITELIST = ['jcc', 'mjw271', 'peb60']
"""These users are always permitted to login (i.e. they can't be blacklisted)
and are automatically admins."""

SSO_ATTRIBUTE_MAP = {
    'SHIB_UID_1': (True, 'netid'),
    # 'SHIB_UID_2': (True, 'uid2'),
    'SHIB_UID_3': (True, 'employeeType'),
}
"""Map SSO attributes to session keys"""

SSO_LOGIN_URL = '/login'
"""URL for local shibboleth login"""

LOG_FORMAT = '%(levelname)s %(asctime)s: %(message)s [in %(pathname)s:%(lineno)d]'
"""The format for the logger."""

LOG_FILENAME = 'shrunk.log'
"""The name of the log file."""

MAX_DISPLAY_LINKS = 50
"""The maximum number of links to display per page."""

MAX_VISITS_FOR_CSV = 6000
"""The maximum number of visits to allow when generating a CSV file from search
   results. If a CSV would have more than this number of visits, an error is returned.
   This restriction does not apply to CSV files generated from a single short URL."""

BANNED_REGEXES = [r'\.xxx']

DEV_LOGINS = True

LDAP_VALIDATE_NETIDS = False
"""Whether to query the LDAP server to validate netids."""

RESERVED_WORDS = ['projectnightnight', 'shibboleth', 'shibboleth-sp', 'status']
"""Words that cannot be used as shortened URLs. Names used as routes are automatically
disallowed, and do not need to be added to this list."""

TESTING = True

WTF_CSRF_ENABLED = False

SECURITY_MEASURES_ON = True
"""Whether the security measures are turned on or off.
You would this to be set to True when performing unit tests
or you'll fail the security tests. However, in prod it can be whatever."""
