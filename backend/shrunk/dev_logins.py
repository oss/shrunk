""" Development logins. We have one DEV_* user for each user class
    (regular, facstaff, power user, admin). """

from typing import Optional, Any

from flask import Blueprint, current_app, session, redirect, url_for
from werkzeug.exceptions import abort

__all__ = ['bp']

bp = Blueprint('devlogins', __name__, url_prefix='/app/devlogins')


def mk_dev_login(netid: str, role: Optional[str]) -> Any:
    def view() -> Any:
        if not current_app.config.get('DEV_LOGINS'):
            current_app.logger.warning(f'failed dev login with {netid}')
            abort(403)

        current_app.logger.info(f'successful dev login with netid {netid}')
        session.update({'user': {'netid': netid}})
        if role is not None and not current_app.client.roles.has(role, netid):
            current_app.client.roles.grant(role, 'Justice League', netid)
        return redirect(url_for('shrunk.index'))
    return view


bp.add_url_rule('/user', 'user', mk_dev_login('DEV_USER', None))
bp.add_url_rule('/facstaff', 'facstaff', mk_dev_login('DEV_FACSTAFF', 'facstaff'))
bp.add_url_rule('/power', 'power', mk_dev_login('DEV_PWR_USER', 'power_user'))
bp.add_url_rule('/admin', 'admin', mk_dev_login('DEV_ADMIN', 'admin'))
