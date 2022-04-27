""" Shrunk, the official URL shortener of Rutgers University. """

import logging
import base64
import binascii
import codecs
import datetime
from typing import Any

import flask
from flask import Flask, current_app, render_template, redirect, request
from flask.json import JSONEncoder
from flask.logging import default_handler
from flask_mailman import Mail
from werkzeug.routing import BaseConverter, ValidationError
from werkzeug.middleware.proxy_fix import ProxyFix
from bson import ObjectId
import bson.errors
from backports import datetime_fromisoformat

# Blueprints
from . import views
from . import dev_logins
from . import api

# Extensions
from . import sso

from .util.ldap import is_valid_netid
from .client import ShrunkClient
from .util.string import validate_url, get_domain


class ObjectIdConverter(BaseConverter):
    """URL converter for BSON object IDs, which we commonly use
    as canonical IDs for objects."""

    def to_python(self, value: str) -> ObjectId:
        try:
            return ObjectId(value)
        except bson.errors.InvalidId as e:
            raise ValidationError from e

    def to_url(self, value: ObjectId) -> str:
        return str(value)


class Base32Converter(BaseConverter):
    """URL converter to handle base32-encoded strings. This is useful
    since Apache apparently has problems with urlencoded-slashes."""

    def to_python(self, value: str) -> str:
        try:
            return str(base64.b32decode(bytes(value, 'utf8')), 'utf8')
        except binascii.Error as e:
            raise ValidationError from e

    def to_url(self, value: str) -> str:
        return str(base64.b32encode(bytes(value, 'utf8')), 'utf8')


class ShrunkEncoder(JSONEncoder):
    def default(self, o):
        if isinstance(o, ObjectId):
            return str(o)
        if isinstance(o, datetime.datetime):
            return o.isoformat()
        return JSONEncoder.default(self, o)


class HexTokenConverter(BaseConverter):
    def to_python(self, value: str) -> bytes:
        try:
            token = codecs.decode(bytes(value, 'utf8'), encoding='hex')
        except binascii.Error as e:
            raise ValidationError from e
        if len(token) != 16:
            raise ValidationError('Token should be 16 bytes in length')
        return token

    def to_url(self, value: bytes) -> str:
        return str(codecs.encode(value, encoding='hex'), 'utf8')


class RequestFormatter(logging.Formatter):
    def format(self, record: Any) -> str:
        record.url = None
        record.remote_addr = None
        record.user = None
        if flask.has_request_context():
            record.url = flask.request.url
            record.remote_addr = flask.request.remote_addr
            if 'user' in flask.session:
                record.user = flask.session['user']['netid']
        return super().format(record)


def _init_logging() -> None:
    """Sets up self.logger with default settings."""
    formatter = logging.Formatter(current_app.config['LOG_FORMAT'])
    handler = logging.FileHandler(current_app.config['LOG_FILENAME'])
    handler.setLevel(logging.INFO)
    handler.setFormatter(formatter)
    current_app.logger.addHandler(handler)
    current_app.logger.setLevel(logging.INFO)


def _init_shrunk_client() -> None:
    """Connect to the database specified in self.config.
    self.logger must be initialized before this function is called."""
    current_app.client = ShrunkClient(**current_app.config)


def _init_roles() -> None:
    client: ShrunkClient = current_app.client

    def is_admin(netid: str) -> bool:
        return client.roles.has('admin', netid)

    client.roles.create('admin', is_admin, is_valid_netid, custom_text={'title': 'Admins'})

    client.roles.create('power_user', is_admin, is_valid_netid, custom_text={
        'title': 'Power Users',
        'grant_title': 'Grant power user',
        'revoke_title': 'Revoke power user',
        'allow_comment': True,
        'comment_prompt': 'Describe why the user has been granted power user access to Go.',
    })

    def onblacklist(netid: str) -> None:
        client.links.blacklist_user_links(netid)

    def unblacklist(netid: str) -> None:
        client.links.unblacklist_user_links(netid)

    client.roles.create('blacklisted', is_admin, is_valid_netid, custom_text={
        'title': 'Blacklisted Users',
        'grant_title': 'Blacklist a user:',
        'grantee_text': 'User to blacklist (and disable their links)',
        'grant_button': 'BLACKLIST',
        'revoke_title': 'Unblacklist a user',
        'revoke_button': 'UNBLACKLIST',
        'empty': 'There are currently no blacklisted users',
        'granted_by': 'blacklisted by',
    }, oncreate=onblacklist, onrevoke=unblacklist)

    def onblock(url: str) -> None:
        domain = get_domain(url)
        urls = client.db.urls
        current_app.logger.info(f'url {url} has been blocked. removing all urls with domain {domain}')

        # . needs to be escaped in the domain because it is regex wildcard
        contains_domain = urls.find({'long_url': {'$regex': '%s*' % domain.replace('.', r'\.')}})

        matches_domain = [link for link in contains_domain if get_domain(link['long_url']) == domain]

        msg = 'deleting links: ' \
            + ', '.join(f'{link["_id"]} -> {link["long_url"]}' for link in matches_domain)
        current_app.logger.info(msg)

        client.links.block_urls(list(doc['_id'] for doc in matches_domain))

    def unblock(url: str) -> None:
        urls = client.db.urls
        domain = get_domain(url)
        contains_domain = urls.find({
            'long_url': {'$regex': '%s*' % domain.replace('.', r'\.')},
            'deleted': True,
            'deleted_by': '!BLOCKED',
        })

        matches_domain = [link for link in contains_domain if get_domain(link['long_url']) == domain]
        client.links.unblock_urls(list(doc['_id'] for doc in matches_domain))

    client.roles.create('blocked_url', is_admin, validate_url, custom_text={
        'title': 'Blocked URLs',
        'invalid': 'Bad URL',
        'grant_title': 'Block a URL:',
        'grantee_text': 'URL to block',
        'grant_button': 'BLOCK',
        'revoke_title': 'Unblock a URL',
        'revoke_button': 'UNBLOCK',
        'empty': 'There are currently no blocked URLs',
        'granted_by': 'Blocked by',
    }, process_entity=get_domain, oncreate=onblock, onrevoke=unblock)

    client.roles.create('whitelisted',
                        lambda netid: client.roles.has_some(['admin', 'facstaff', 'power_user'], netid),
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
                            'comment_prompt': 'Describe why the user has been granted access to Go.',
                        })

    client.roles.create('facstaff', is_admin, is_valid_netid,
                        custom_text={'title': 'Faculty or Staff Member'})


def create_app(config_path: str = 'config.py', **kwargs: Any) -> Flask:
    # Backport the datetime.datetime.fromisoformat method. Can be removed
    # once we update to Python 3.7+.
    datetime_fromisoformat.MonkeyPatch.patch_fromisoformat()

    app = Flask(__name__, static_url_path='/app/static')
    app.config.from_pyfile(config_path, silent=False)
    app.config.update(kwargs)

    app.json_encoder = ShrunkEncoder

    formatter = RequestFormatter(
        '[%(asctime)s] [%(user)s@%(remote_addr)s] [%(url)s] %(levelname)s '
        + 'in %(module)s: %(message)s',
    )
    default_handler.setFormatter(formatter)

    # install url converters
    app.url_map.converters['ObjectId'] = ObjectIdConverter
    app.url_map.converters['b32'] = Base32Converter
    app.url_map.converters['hex_token'] = HexTokenConverter

    # call initialization functions
    app.before_first_request(_init_logging)
    app.before_first_request(_init_shrunk_client)
    app.before_first_request(_init_roles)

    # wsgi middleware
    app.wsgi_app = ProxyFix(app.wsgi_app)  # type: ignore

    # set up blueprints
    app.register_blueprint(views.bp)
    if app.config.get('DEV_LOGINS', False) is True:
        app.register_blueprint(dev_logins.bp)
    app.register_blueprint(api.link.bp)
    app.register_blueprint(api.org.bp)
    app.register_blueprint(api.role.bp)
    app.register_blueprint(api.search.bp)
    app.register_blueprint(api.admin.bp)
    app.register_blueprint(api.alert.bp)
    app.register_blueprint(api.request.bp)
    app.register_blueprint(api.security.bp)

    # set up extensions
    mail = Mail()
    mail.init_app(app)
    app.mail = mail
    sso.ext.init_app(app)

    # redirect / to /app
    @app.route('/', methods=['GET'])
    def _redirect_to_real_index() -> Any:
        return redirect('/app')

    # serve redirects
    @app.route('/<alias>', methods=['GET'])
    def _serve_redirect(alias: str) -> Any:
        client: ShrunkClient = current_app.client
        long_url = client.links.get_long_url(alias)
        if long_url is None:
            return render_template('404.html'), 404

        # Get or generate a tracking id
        tracking_id = request.cookies.get('shrunkid') or client.tracking.get_new_id()
        if request.headers.get('DNT', '0') != '0':
            # If DNT is set, generate a unique ID for each visit
            tracking_id = client.tracking.get_new_id()

        client.links.visit(alias,
                           tracking_id,
                           request.remote_addr,
                           request.headers.get('User-Agent'),
                           request.headers.get('Referer'))
        if '://' not in long_url:
            long_url = f'http://{long_url}'
        response = redirect(long_url)

        # Make sure we don't set the tracking ID cookie if DNT is set
        if request.headers.get('DNT', '0') == '0':
            response.set_cookie('shrunkid', tracking_id)

        return response

    @app.before_request
    def _record_visit() -> None:
        netid = flask.session['user']['netid'] if 'user' in flask.session else None
        endpoint = flask.request.endpoint or 'error'
        current_app.client.record_visit(netid, endpoint)

    return app
