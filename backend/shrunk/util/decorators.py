"""Decorators to be used on view functions."""

from typing import Any
import functools

from flask import current_app, redirect, url_for, request, session
from flask_mailman import Mail
from werkzeug.exceptions import abort
import jsonschema

__all__ = ['require_login', 'request_schema']


def require_login(func: Any) -> Any:
    """decorator to check if user is logged in"""
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        client = current_app.client
        logger = current_app.logger
        if 'user' not in session or 'netid' not in session['user']:
            logger.debug('require_login: user not logged in')
            return redirect(url_for('shrunk.login'))
        netid = session['user']['netid']
        if client.roles.has('blacklisted', netid):
            logger.warning(f'require_login: user {netid} is blacklisted')
            abort(403)
        return func(netid, client, *args, **kwargs)
    return wrapper


def require_mail(func: Any) -> Any:
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        mail: Mail = current_app.mail
        return func(mail, *args, **kwargs)
    return wrapper


def request_schema(schema: Any) -> Any:
    def check_body(func: Any) -> Any:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            req = request.get_json(silent=True)
            if req is None:
                abort(400)
            try:
                jsonschema.validate(req, schema, format_checker=jsonschema.draft7_format_checker)
            except jsonschema.exceptions.ValidationError:
                abort(400)
            return func(req, *args, **kwargs)
        return wrapper
    return check_body
