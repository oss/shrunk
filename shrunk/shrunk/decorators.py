""" Decorators to be used on view functions. """

import functools

import flask
from werkzeug.exceptions import abort

from . import roles


def require_qualified(func):
    """
    if user is not qualified to add an entity to a role then
    redirect to unauthorized
    """
    @functools.wraps(func)
    def wrapper(role, *args, **kwargs):
        logger = flask.current_app.logger
        if not roles.exists(role):
            logger.error(f'require_qualified: role {role} does not exist')
            return flask.redirect(flask.url_for('shrunk.render_index'))
        if 'user' not in flask.session:
            return flask.redirect(flask.url_for('shrunk.render_index'))
        netid = flask.session['user']['netid']
        if roles.qualified_for[role](netid):
            logger.debug(f'require_qualified: user {netid} authorized for role {role}')
            new_args = [role] + list(args)
            return func(*new_args, **kwargs)
        logger.warning(f'require_qualified: user {netid} not authorized for role {role}')
        abort(403)
    return wrapper


def require_login(func):
    """decorator to check if user is logged in"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logger = flask.current_app.logger
        if 'user' not in flask.session or 'netid' not in flask.session['user']:
            logger.debug(f'require_login: user not logged in')
            return flask.redirect(flask.url_for('shrunk.render_login'))
        netid = flask.session['user']['netid']
        if roles.check('blacklisted', netid):
            logger.warning(f'require_login: user {netid} is blacklisted')
            abort(403)
        client = flask.current_app.get_shrunk()
        return func(netid, client, *args, **kwargs)
    return wrapper


def require_admin(func):
    """decorator to check if user is an admin"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logger = flask.current_app.logger
        netid = flask.session['user']['netid']
        if not roles.check('admin', netid):
            logger.warning(f'require_admin: user {netid} is not an admin')
            abort(403)
        logger.debug(f'require_admin: user {netid} authorized for admin')
        return func(*args, **kwargs)
    return wrapper
