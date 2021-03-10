"""This module contains basic endpoints."""

import base64
from typing import Any
import json
import os

from flask import (Blueprint,
                   redirect,
                   session,
                   render_template,
                   current_app,
                   make_response,
                   url_for)
from werkzeug.exceptions import abort

from shrunk.client import ShrunkClient
from shrunk.client.exceptions import NoSuchObjectException
from shrunk.util.decorators import require_login

__all__ = ['bp']

bp = Blueprint('shrunk', __name__, url_prefix='/app')


@bp.route('/', methods=['GET'])
def index() -> Any:
    """Return the main SPA page if the user is logged in; otherwise redirect
    to the login page."""
    if 'user' not in session:
        return redirect(url_for('shrunk.login'))

    netid: str = session['user']['netid']
    client = current_app.client

    shrunk_params = json.dumps({
        'netid': session['user']['netid'],
        'userPrivileges': [role for role in ['facstaff', 'power_user', 'admin']
                           if client.roles.has(role, netid)],
    })
    shrunk_params = str(base64.b64encode(bytes(shrunk_params, 'utf8')), 'utf8')

    secure_cookie = True # if FLASK_ENV var exists and it equals "dev" then set it to false.
    if "FLASK_ENV" in os.environ:
        if os.environ.get("FLASK_ENV") == "dev":
            secure_cookie = False

    resp = make_response(render_template('index.html'))
    resp.set_cookie('shrunk_params', shrunk_params, secure=secure_cookie, samesite='Strict')
    return resp


@bp.route('/shrunk-login', methods=['GET'])
def login() -> Any:
    """Renders the login template. Redirects to index if user is logged in."""
    if 'user' in session:
        return redirect(url_for('shrunk.index'))
    enable_dev = current_app.config.get('DEV_LOGINS', False)
    return render_template('login.html', shib_login='/login', dev=enable_dev)


@bp.route('/logout')
def logout() -> Any:
    """Clears the user's session and sends them to Shibboleth to finish logging out.
    Redirects to index if user is not logged in."""
    if 'user' not in session:
        return redirect(url_for('shrunk.index'))

    # Get the current netid and clear the session.
    netid = session['user']['netid']
    session.clear()

    # If the user is a dev user, all we need to do to log out is to clear the session,
    # which we did above.
    if current_app.config.get('DEV_LOGINS') and netid in {'DEV_USER', 'DEV_FACSTAFF', 'DEV_PWR_USER', 'DEV_ADMIN'}:
        return redirect(url_for('shrunk.login'))

    # If the user is not a dev user, redirect to shibboleth to complete the logout process.
    return redirect('/shibboleth/Logout')


@bp.route('/access_request/<hex_token:token>/accept', methods=['GET'])
@require_login
def accept_access_request(netid: str, client: ShrunkClient, token: bytes) -> Any:
    try:
        if not client.roles.has('admin', netid) and not client.links.check_access_request_permission(token, netid):
            abort(403)
    except NoSuchObjectException:
        abort(404)
    client.links.accept_access_request(token)
    return render_template('access_request_resolved.html', message='The access request has been granted.')


@bp.route('/access_request/<hex_token:token>/deny', methods=['GET'])
@require_login
def deny_access_request(netid: str, client: ShrunkClient, token: bytes) -> Any:
    try:
        if not client.roles.has('admin', netid) and not client.links.check_access_request_permission(token, netid):
            abort(403)
    except NoSuchObjectException:
        abort(404)
    client.links.deny_access_request(token)
    return render_template('access_request_resolved.html', message='The access request has been denied.')
