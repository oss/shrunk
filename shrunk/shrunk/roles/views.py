""" Sets up handlers for the following routes:
     * GET  /roles/<role>/
     * POST /roles/<role>/
     * POST /roles/<role>/revoke """


import flask

from .. import roles
from ..decorators import require_qualified, require_login


bp = flask.Blueprint('roles', __name__, url_prefix='/roles')


@bp.route('/<role>/', endpoint='list', methods=['GET'])
@require_qualified
@require_login
def role_list(netid, client, role):
    kwargs = roles.template_data(role, netid)
    return flask.render_template('role.html', **kwargs)


@bp.route('/<role>/', endpoint='grant', methods=['POST'])
@require_qualified
@require_login
def role_grant(netid, client, role):
    try:
        entity = flask.request.form['entity']
        if roles.check(role, entity):
            kwargs = roles.template_data(role, netid)
            kwargs['error'] = 'Role already granted.'
            return flask.render_template('role.html', **kwargs), 400
        allow_comment = roles.template_data(role, netid)['allow_comment']
        comment = ''
        if allow_comment:
            comment = flask.request.form.get('comment')
            if not comment:
                kwargs = roles.template_data(role, netid, invalid=True)
                return flask.render_template('role.html', **kwargs), 400
        roles.grant(role, netid, entity, comment)
        return flask.redirect(flask.url_for('roles.list', role=role))
    except roles.InvalidEntity:
        kwargs = roles.template_data(role, netid, invalid=True)
        return flask.render_template('role.html', **kwargs), 400


@bp.route('/<role>/revoke', endpoint='revoke', methods=['POST'])
@require_qualified
@require_login
def role_revoke(netid, client, role):
    entity = flask.request.form['entity']
    granted_by = roles.granted_by(role, entity)
    if roles.check('admin', netid) or (granted_by and netid == granted_by):
        roles.revoke(role, entity)
        return flask.redirect(flask.url_for('roles.list', role=role))
    kwargs = roles.template_data(role, netid, invalid=True)
    return flask.render_template('role.html', **kwargs), 403
