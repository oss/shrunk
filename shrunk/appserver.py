""" Sets up the Flask application for the main web server. """

import datetime

import flask
from flask import (Blueprint,
                   make_response,
                   request,
                   redirect,
                   session,
                   render_template,
                   current_app,
                   url_for)
from werkzeug.exceptions import abort

from . import forms
from .util import search
from .client.exceptions import (BadShortURLException,
                                ForbiddenDomainException,
                                AuthenticationException,
                                NoSuchLinkException)
from .decorators import require_login, require_admin


bp = Blueprint('shrunk', __name__, url_prefix='/app')


@bp.route('/logout')
def logout():
    """ Clears the user's session and sends them to Shibboleth to finish logging out. """
    if 'user' not in session:
        return redirect(url_for('shrunk.render_login'))
    user = session.pop('user')
    session.clear()
    current_app.logger.info('logout')
    if current_app.config.get('DEV_LOGINS'):
        if user['netid'] in ['DEV_USER', 'DEV_FACSTAFF', 'DEV_PWR_USER', 'DEV_ADMIN']:
            return redirect(url_for('shrunk.render_login'))
    return redirect('/shibboleth/Logout')


@bp.route('/shrunk-login')
def render_login(**kwargs):
    """Renders the login template.

    Takes a WTForm in the keyword arguments.
    """
    if 'user' in session:
        return redirect(url_for('shrunk.render_index'))
    enable_dev = bool(current_app.config.get('DEV_LOGINS', False))
    kwargs.update({'shib_login': '/login', 'dev': enable_dev})
    return make_response(render_template('login.html', **kwargs))


# ===== Views =====
# route /<short url> handle by shrunkFlaskMini


@bp.route('/')
@require_login
def render_index(netid, client, **kwargs):
    """Renders the homepage.

    Renders the homepage for the current user. By default, this renders all of
    the links owned by them. If a search has been made, then only the links
    matching their search query are shown.
    """

    show_deleted = client.check_role('admin', netid)
    results = search.search(netid, client, request, session, show_deleted)

    kwargs.update({'begin_pages': results.begin_page,
                   'end_pages': results.end_page,
                   'lastpage': results.total_pages,
                   'page': results.page,
                   'links': list(results),
                   'linkserver_url': current_app.config['LINKSERVER_URL'],
                   'current_time': datetime.datetime.now(),
                   'selected_links_set': search.display_links_set(results.links_set)})
    return render_template('index.html', **kwargs)


@bp.route('/add', methods=['POST'])
@require_login
def add_link(netid, client):
    """ Adds a new link for the current user and handles errors. """

    form = forms.AddLinkForm(request.form, current_app.config['BANNED_REGEXES'])
    if form.validate():
        kwargs = form.to_json()
        kwargs['netid'] = netid
        admin_or_power = client.has_some_role(['admin', 'power_user'], netid)

        if kwargs['short_url'] and not admin_or_power:
            abort(403)

        try:
            shortened = client.create_short_url(creator_ip=request.remote_addr, **kwargs)
            current_app.logger.info(f'add: {shortened} -> {kwargs["long_url"]}')
            short_url = '{}/{}'.format(current_app.config['LINKSERVER_URL'], shortened)
            return flask.jsonify({'ok': True, 'success': {'short_url': short_url}})
        except BadShortURLException as ex:
            return flask.jsonify({'ok': False,
                                  'errors': [{'name': 'short_url', 'error': str(ex)}]}), 400
        except ForbiddenDomainException as ex:
            return flask.jsonify({'ok': False,
                                  'errors': [{'name': 'long_url', 'error': str(ex)}]}), 400
    else:
        return flask.jsonify({
            'ok': False,
            'errors': [{'name': name, 'error': form.errors.get(name)}
                       for name in ['title', 'long_url', 'short_url', 'expiration_time']
                       if form.errors.get(name)]
        }), 400


@bp.route('/stats', methods=['GET'])
@require_login
def get_stats(netid, client):
    """ Render the stats page for a given URL. """

    url = request.args.get('url')
    if not url:
        abort(400)

    current_app.logger.info(f'stats: {url}')

    if not client.may_view_url(url, netid):
        abort(403)

    url_info = client.get_url_info(url)
    kwargs = {
        'url_info': url_info,
        'missing_url': False,
        'monthy_visits': [],
        'short_url': url,
    }

    return render_template('stats.html', **kwargs)


@bp.route('/delete', methods=['POST'])
@require_login
def delete_link(netid, client):
    """Deletes a link."""

    short_url = request.form.get('short_url')
    if not short_url:
        current_app.logger.info('invalid delete request')
        return flask.jsonify({'ok': False,
                              'errors': [{'name': 'short_url', 'error': 'not present'}]}), 400
    current_app.logger.info(f'delete: {short_url}')

    try:
        client.delete_url(short_url, netid)
    except AuthenticationException:
        return flask.jsonify({'ok': False,
                              'errors': [{'name': 'short_url', 'error': 'not authorized'}]}), 403
    except NoSuchLinkException:
        return flask.jsonify({'ok': False,
                              'errors': [{'name': 'short_url', 'error': 'does not exist'}]}), 400

    return flask.jsonify({'ok': True}), 200


@bp.route('/clear_visits', methods=['POST'])
@require_login
def clear_link_visits(netid, client):
    """Clears all visit data associated with a link."""

    short_url = request.form.get('short_url')
    if not short_url:
        current_app.logger.info('invalid clear visits request')
        return flask.jsonify({'ok': False,
                              'errors': [{'name': 'short_url', 'error': 'not present'}]}), 400
    current_app.logger.info(f'clear visits: {short_url}')

    try:
        client.clear_visits(short_url, netid)
    except AuthenticationException:
        return flask.jsonify({'ok': False,
                              'errors': [{'name': 'short_url', 'error': 'not authorized'}]}), 403
    except NoSuchLinkException:
        return flask.jsonify({'ok': False,
                              'errors': [{'name': 'short_url', 'error': 'does not exist'}]}), 400

    return flask.jsonify({'ok': True}), 200


@bp.route('/edit', methods=['POST'])
@require_login
def edit_link(netid, client):
    """Edits a link.

    On POST, this route expects a form that contains the unique short URL that
    will be edited.
    """

    form = forms.EditLinkForm(request.form, current_app.config['BANNED_REGEXES'])
    if form.validate():
        # The form has been validated---now do permissions checking
        kwargs = form.to_json()
        admin_or_power = client.has_some_role(['admin', 'power_user'], netid)

        current_app.logger.info(f'edit {kwargs["old_short_url"]}: {kwargs["short_url"]} '
                                + '-> {kwargs["long_url"]}')

        if not client.is_owner_or_admin(kwargs['old_short_url'], netid):
            abort(403)

        if kwargs['short_url'] != kwargs['old_short_url'] and not admin_or_power:
            abort(403)

        try:
            # The client has permission---try to update the database
            client.modify_url(**kwargs)
            return flask.jsonify({'ok': True})
        except BadShortURLException as ex:
            return flask.jsonify({'ok': False,
                                  'errors': [{'name': 'short_url', 'error': str(ex)}]}), 400
        except ForbiddenDomainException as ex:
            return flask.jsonify({'ok': False,
                                  'errors': [{'name': 'short_url', 'error': str(ex)}]}), 400
    else:
        return flask.jsonify({
            'ok': False,
            'errors': [{'name': name, 'error': form.errors.get(name)}
                       for name in ['title', 'long_url', 'short_url']
                       if form.errors.get(name)]
        }), 400


@bp.route('/faq', methods=['GET'])
@require_login
def faq(netid, client):
    """Render the FAQ."""
    return render_template('faq.html')


@bp.route('/admin/')
@require_login
@require_admin
def admin_panel(netid, client):
    """
    Renders the administrator panel.

    This displays an administrator panel with navigation links to the admin
    controls.
    """

    valid_roles = client.valid_roles()
    roledata = [{'id': role, 'title': client.role_form_text(role)['title']} for role in valid_roles]
    stats = client.get_admin_stats()
    current_app.logger.info('admin panel')
    return render_template('admin.html', roledata=roledata, stats=stats)
