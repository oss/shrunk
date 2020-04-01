""" Shibboleth authentication. """

import flask
import flask_sso
from werkzeug.exceptions import abort

ext = flask_sso.SSO()


@ext.login_handler
def login(user_info):
    """ Get the user's attributes from shibboleth, decide whether the user
        should be allowed to access Shrunk, and possibly grant roles. The
        roles system must be initialized before this function is called. """

    client = flask.current_app.get_shrunk()
    logger = flask.current_app.logger
    types = user_info.get('employeeType').split(';')
    netid = user_info.get('netid')
    twoFactorAuth = user_info.get('twoFactorAuth')
    if not twoFactorAuth and flask.current_app.config['REQUIRE_2FA']:
        return flask.render_template('help_no_2fa.html')

    def t(typ):  # pylint: disable=invalid-name
        return typ in types

    def log_failed(why):
        user_roles = user_info.get('employeeType')
        logger.info(f'login: failed SSO login for {netid} (roles: {user_roles}, reason: {why})')

    # get info from shibboleth types
    fac_staff = t('FACULTY') or t('STAFF')

    # get info from ACLs
    is_blacklisted = client.check_role('blacklisted', netid)
    is_whitelisted = client.check_role('whitelisted', netid)
    is_config_whitelisted = netid in flask.current_app.config['USER_WHITELIST']

    # now make decisions regarding whether the user can login, and what privs they should get

    # blacklisted users can never login, except config-whitelisted users can't
    # be blacklisted (so OSS people can always login)
    if is_blacklisted and not is_config_whitelisted:
        log_failed('blacklisted')
        abort(403)

    # config-whitelisted users are automatically made admins
    if is_config_whitelisted:
        client.grant_role('admin', 'Justice League', netid)

    # (if not blacklisted) facstaff can always login, but we need to grant a role
    # so the rest of the app knows what privs to give the user
    if fac_staff:
        client.grant_role('facstaff', 'shibboleth', netid)

    # now determine whether to allow login
    if not (is_config_whitelisted or fac_staff or is_whitelisted):
        log_failed('unauthorized')
        abort(403)

    # If we get here, the user is allowed to login, and all necessary privs
    # have been granted.
    logger.debug(f'login: SSO login by {netid}')
    flask.session['user'] = user_info
    return flask.redirect(flask.url_for('shrunk.render_index'))
