"""This module contains basic endpoints."""

from typing import Any
import json
import base64

from flask import (Blueprint,
                   redirect,
                   session,
                   render_template,
                   current_app,
                   make_response,
                   url_for)

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

    resp = make_response(render_template('index.html'))
    resp.set_cookie('shrunk_params', shrunk_params, secure=True, samesite='Strict')
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
