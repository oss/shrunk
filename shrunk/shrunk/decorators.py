""" Decorators to be used on view functions. """

import functools

import flask

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
            return flask.redirect('/')
        netid = flask.session['user']['netid']
        if roles.qualified_for[role](netid):
            logger.debug(f'require_qualified: user {netid} authorized for role {role}')
            new_args = [role] + list(args)
            return func(*new_args, **kwargs)
        logger.warning(f'require_qualified: user {netid} not authorized for role {role}')
        return flask.redirect('/unauthorized')
    return wrapper


def require_role(role):
    """force a somone to have a role to see an endpoint
    @app.route("/my/secret/route")
    @roles.require("cool_person")
    def secret_route():
       return "top secret stuff"
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            logger = flask.current_app.logger
            if not roles.exists(role):
                logger.error(f'require_role: role {role} does not exist')
                return flask.redirect('/')
            if roles.qualified_for[role](flask.session['user']['netid']):
                logger.debug(f'require_role: user {netid} authorized for role {role}')
                return func(*args, **kwargs)
            logger.warning(f'require_role: user {netid} not authorized for role {role}')
            return flask.redirect('/unauthorized')
        return wrapper
    return decorator


def require_login(func):
    """decorator to check if user is logged in"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logger = flask.current_app.logger
        if 'user' not in flask.session or 'netid' not in flask.session['user']:
            logger.debug(f'require_login: user not logged in')
            return flask.redirect('/shrunk-login')
        netid = flask.session['user']['netid']
        if roles.check('blacklisted', netid):
            logger.warning(f'require_login: user {netid} is blacklisted')
            return flask.redirect('/unauthorized')
        client = flask.current_app.get_shrunk()
        return func(netid, client, *args, **kwargs)
    return wrapper


def require_admin(func):
    """decorator to check if user is an admin"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        logger = flask.current_app.logger
        netid = flask.session['user'].get('netid')
        if roles.check('blacklisted', netid):
            logger.warning(f'require_admin: user {netid} is blacklisted')
            return flask.redirect('/unauthorized')
        if not roles.check('admin', netid):
            logger.warning(f'require_admin: user {netid} is not an admin')
            return flask.redirect('/')
        logger.debug(f'require_admin: user {netid} authorized for admin')
        return func(*args, **kwargs)
    return wrapper
