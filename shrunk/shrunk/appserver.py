""" Sets up the Flask application for the main web server. """

import flask
from flask import Blueprint, make_response, request, redirect, session, \
    render_template, current_app, url_for
from werkzeug.exceptions import abort

from . import roles
from . import forms
from .util import search
from .client import BadShortURLException, ForbiddenDomainException, \
    AuthenticationException, NoSuchLinkException
from .decorators import require_login, require_admin


bp = Blueprint('shrunk', __name__, url_prefix='/')


@bp.route('/logout')
def logout():
    """ Clears the user's session and sends them to Shibboleth to finish logging out. """
    if "user" not in session:
        return redirect(url_for('shrunk.render_login'))
    user = session.pop('user')
    session.clear()
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

    def display_links_set(links_set):
        """ Get a human-readable name for links_set. """
        if links_set == 'GO!my':
            return 'My links'
        if links_set == 'GO!all':
            return 'All links'
        return links_set

    results = search.search(netid, client, request, session)

    kwargs.update({'begin_pages': results.begin_page,
                   'end_pages': results.end_page,
                   'lastpage': results.total_pages,
                   'page': results.page,
                   'links': list(results),
                   'linkserver_url': current_app.config['LINKSERVER_URL'],
                   'selected_links_set': display_links_set(results.links_set),
                   'orgs': list(client.get_member_organizations(netid))})
    return render_template('index.html', **kwargs)


@bp.route('/add', methods=['POST'])
@require_login
def add_link(netid, client):
    """ Adds a new link for the current user and handles errors. """

    form = forms.AddLinkForm(request.form, current_app.config['BANNED_REGEXES'])
    if form.validate():
        kwargs = form.to_json()
        kwargs['netid'] = netid
        admin_or_power = roles.check('admin', netid) or roles.check('power_user', netid)

        if kwargs['short_url'] and not admin_or_power:
            abort(403)

        try:
            shortened = client.create_short_url(**kwargs)
            short_url = '{}/{}'.format(current_app.config['LINKSERVER_URL'], shortened)
            return flask.jsonify({'success': {'short_url': short_url}})
        except BadShortURLException as ex:
            return flask.jsonify({'errors': {'short_url': str(ex)}}), 400
        except ForbiddenDomainException as ex:
            return flask.jsonify({'errors': {'long_url': str(ex)}}), 400
    else:
        resp = {'errors': {}}
        for name in ['title', 'long_url', 'short_url']:
            err = form.errors.get(name)
            if err:
                resp['errors'][name] = err[0]
        return flask.jsonify(resp), 400


@bp.route('/stats', methods=['GET'])
@require_login
def get_stats(netid, client):
    """ Render the stats page for a given URL. """

    url = request.args.get('url')
    if not url:
        abort(400)

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


@bp.route('/qr', methods=['GET'])
@require_login
def qr_code(netid, client):
    """ Render a QR code for the given link. """

    url = request.args.get('url')
    if not url:
        abort(400)

    url_exists = client.get_long_url(url) is not None
    kwargs = {
        'url': url,
        'url_exists': url_exists
    }

    if url_exists and 'print' in request.args:
        return render_template('qr_print.html', **kwargs)
    return render_template('qr.html', **kwargs)


@bp.route('/delete', methods=['POST'])
@require_login
def delete_link(netid, client):
    """Deletes a link."""

    short_url = request.form.get('short_url')
    if not short_url:
        current_app.logger.info(f'{netid} sends an invalid delete request')
        abort(400)
    current_app.logger.info(f'{netid} tries to delete {short_url}')

    try:
        client.delete_url(short_url, netid)
    except AuthenticationException:
        abort(403)
    except NoSuchLinkException:
        abort(400)

    return '', 200


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
        admin_or_power = roles.check('admin', netid) or roles.check('power_user', netid)

        if not client.is_owner_or_admin(kwargs['old_short_url'], netid):
            abort(403)

        if kwargs['short_url'] != kwargs['old_short_url'] and not admin_or_power:
            abort(403)

        try:
            # The client has permission---try to update the database
            client.modify_url(**kwargs)
            return flask.jsonify({'success': {}})
        except BadShortURLException as ex:
            return flask.jsonify({'errors': {'short_url': str(ex)}}), 400
        except ForbiddenDomainException as ex:
            return flask.jsonify({'errors': {'short_url': str(ex)}}), 400
    else:
        resp = {'errors': {}}
        for name in ['title', 'long_url', 'short_url']:
            err = form.errors.get(name)
            if err:
                resp['errors'][name] = err[0]
        return flask.jsonify(resp), 400


@bp.route('/faq', methods=['GET'])
@require_login
def faq(netid, client):
    """ Render the FAQ. """
    return render_template("faq.html")


@bp.route('/admin/')
@require_login
@require_admin
def admin_panel(netid, client):
    """Renders the administrator panel.

    This displays an administrator panel with navigation links to the admin
    controls.
    """

    valid_roles = roles.valid_roles()
    roledata = [{'id': role, 'title': roles.form_text[role]['title']} for role in valid_roles]
    return render_template('admin.html', roledata=roledata)
