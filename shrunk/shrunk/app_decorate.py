import logging

from flask import Flask, redirect, request, current_app
from werkzeug.exceptions import abort

from . import roles
from .client import ShrunkClient
from .util.string import validate_url, get_domain, formattime
from .util.ldap import is_valid_netid


class ShrunkFlaskMini(Flask):
    """ A wrapped Flask application. This wrapper sets up app.logger
        to write to config['LOG_FILENAME'] and creates a ShrunkClient
        object in self.client. """

    def __init__(self, name):
        super().__init__(name)

        # We don't want to execute these functions in __init__. If we
        # did, merely creating a ShrunkFlask{Mini} object would create a log
        # file and would attempt to connect to the database. Among other
        # things, this would break much of the functionality of the
        # flask CLI (e.g. listing app routes).
        self.before_first_request(self._init_logging)
        self.before_first_request(self._init_shrunk_client)

        # Set up the /<short_url> route. Surely this should not be
        # done in __init__. (FIXME)
        @self.route('/<short_url>')
        def redirect_link(short_url):
            client = self.get_shrunk()
            self.logger.info(f'{request.remote_addr} requests {short_url}')

            # Perform a lookup and redirect
            long_url = client.get_long_url(short_url)
            if long_url is None:
                abort(404)
            else:
                client.visit(short_url, request.remote_addr,
                             request.headers.get('User-Agent'),
                             request.headers.get('Referer'))
                # Check if a protocol exists
                if '://' in long_url:
                    return redirect(long_url)
                else:
                    # the DB doesn't seem to contain any links lacking a protocol,
                    # and a protocol is automatically added to any new links
                    # without one (cf. forms.py). So, can this be removed?
                    return redirect(f'http://{long_url}')

    def _init_logging(self):
        """ Sets up self.logger with default settings. """

        formatter = logging.Formatter(self.config['LOG_FORMAT'])
        handler = logging.FileHandler(self.config['LOG_FILENAME'])
        handler.setLevel(logging.INFO)
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

    def _init_shrunk_client(self):
        """ Connect to the database specified in self.config.
            self.logger must be initialized before this function is called. """

        self._shrunk_client = ShrunkClient(**self.config)

    def get_shrunk(self):
        return self._shrunk_client


class ShrunkFlask(ShrunkFlaskMini):
    """ This class wraps the ShrunkFlaskMini application. It initializes
        the roles system and adds routes for views relevant to that system.
        It also provides several wrappers designed to be used on view
        functions. """

    def __init__(self, name):
        super().__init__(name)

        # Allow formattime() to be called in templates.
        self.jinja_env.globals.update(formattime=formattime)

        # Set up roles system.
        self.before_first_request(self._init_roles)

    def _init_roles(self):
        """ Calls roles.init and then calls roles.new for each role.
            ShrunkFlaskMini._init_shrunk_client must be called before
            this function. """

        # Initialize the roles module.
        roles.init(self, db_name=self.config.get('DB_NAME', 'shrunk'))

        # Create an entry for each role.
        self._add_roles()

    def _add_roles(self):
        def has_some_role(rs):
            def check(netid):
                for r in rs:
                    if not roles.exists(r):
                        current_app.logger.error(f'has_some_role: role {r} does not exist')
                return any(roles.check(r, netid) for r in rs)
            return check

        is_admin = has_some_role(['admin'])

        roles.new('admin', is_admin, is_valid_netid, custom_text={'title': 'Admins'})

        roles.new('power_user', is_admin, is_valid_netid, custom_text={
            'title': 'Power Users',
            'grant_title': 'Grant power user',
            'revoke_title': 'Revoke power user'
        })

        roles.new('blacklisted', is_admin, is_valid_netid, custom_text={
            'title': 'Blacklisted Users',
            'grant_title': 'Blacklist a user:',
            'grantee_text': 'User to blacklist',
            'grant_button': 'BLACKLIST',
            'revoke_title': 'Unblacklist a user',
            'revoke_button': 'UNBLACKLIST',
            'empty': 'There are currently no blacklisted users',
            'granted_by': 'blacklisted by'
        })

        def onblock(url):
            domain = get_domain(url)
            urls = self.get_shrunk().db.urls
            self.logger.info(f'url {url} has been blocked. removing all urls with domain {domain}')

            contains_domain = urls.find({'long_url': {
                # . needs to be escaped in the domain because it is regex wildcard
                '$regex': '%s*' % domain.replace('.', r'\.')
            }})

            matches_domain = [link for link in contains_domain
                              if get_domain(link['long_url']) == domain]

            msg = 'deleting links: ' \
                + ', '.join(f'{l["_id"]} -> {l["long_url"]}' for l in matches_domain)
            self.logger.info(msg)

            result = urls.delete_many({'_id': {'$in': [doc['_id'] for doc in matches_domain]}})
            self.logger.info(f'block {url} delete many result: {result.raw_result}')

        roles.new('blocked_url', is_admin, validate_url, custom_text={
            'title': 'Blocked URLs',
            'invalid': 'Bad URL',
            'grant_title': 'Block a URL:',
            'grantee_text': 'URL to block',
            'grant_button': 'BLOCK',
            'revoke_title': 'Unblock a URL',
            'revoke_button': 'UNBLOCK',
            'empty': 'There are currently no blocked URLs',
            'granted_by': 'Blocked by'
        }, oncreate=onblock)

        roles.new('whitelisted', has_some_role(['admin', 'facstaff', 'power_user']),
                  is_valid_netid, custom_text={
                      'title': 'Whitelisted Users',
                      'grant_title': 'Whitelist a user',
                      'grantee_text': 'User to whitelist',
                      'grant_button': 'WHITELIST',
                      'revoke_title': 'Remove a user from the whitelist',
                      'revoke_button': 'UNWHITELIST',
                      'empty': 'You have not whitelisted any users',
                      'granted_by': 'Whitelisted by',
                      'allow_comment': True,
                      'comment_prompt': 'Describe why the user has been granted access to Go.'
                  })

        roles.new('facstaff', is_admin, is_valid_netid,
                  custom_text={'title': 'Faculty or Staff Member'})
