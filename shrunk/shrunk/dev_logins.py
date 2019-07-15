""" Development logins. We have one DEV_* user for each user class
    (regular, facstaff, power user, admin). """

import flask

from . import util
from . import roles


bp = flask.Blueprint('devlogins', __name__, url_prefix='/devlogins')


def mk_dev_login(netid, role):
    def view():
        if not flask.current_app.config.get('DEV_LOGINS'):
            flask.current_app.logger.warning(f'failed dev login with {netid}')
            return util.unauthorized()

        flask.current_app.logger.info(f'successful dev login with netid {netid}')
        flask.session.update({
            'user': {'netid': netid},
            'all_users': '0',
            'sortby': '0'
        })
        if role is not None and not roles.check(role, netid):
            roles.grant(role, 'Justice League', netid)
        return flask.redirect('/')
    return view


bp.add_url_rule('/user', 'user', mk_dev_login('DEV_USER', None))
bp.add_url_rule('/facstaff', 'facstaff', mk_dev_login('DEV_FACSTAFF', 'facstaff'))
bp.add_url_rule('/power', 'power', mk_dev_login('DEV_PWR_USER', 'power_user'))
bp.add_url_rule('/admin', 'admin', mk_dev_login('DEV_ADMIN', 'admin'))
