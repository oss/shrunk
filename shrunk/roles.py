"""
Sets up handlers for the following routes:
 - ``GET  /app/roles/<role>/``
 - ``POST /app/roles/<role>/``
 - ``POST /app/roles/<role>/revoke``
"""


import flask

from .decorators import require_qualified, require_login
from .client.exceptions import InvalidEntity


bp = flask.Blueprint('roles', __name__, url_prefix='/app/roles')


@bp.route('/<role>/', endpoint='list', methods=['GET'])
@require_qualified
@require_login
def role_list(netid, client, role):
    kwargs = client.role_template_data(role, netid)
    return flask.render_template('role.html', **kwargs)


@bp.route('/<role>/grant', endpoint='grant', methods=['POST'])
@require_qualified
@require_login
def role_grant(netid, client, role):
    try:
        entity = flask.request.form['entity']
        if client.check_role(role, entity):
            kwargs = client.role_template_data(role, netid)
            kwargs['error'] = 'Role already granted.'
            return flask.render_template('role.html', **kwargs), 400
        allow_comment = client.role_template_data(role, netid)['allow_comment']
        comment = ''
        if allow_comment:
            comment = flask.request.form.get('comment')
            if not comment:
                kwargs = client.role_template_data(role, netid, invalid=True)
                return flask.render_template('role.html', **kwargs), 400
        client.grant_role(role, netid, entity, comment)
        return flask.redirect(flask.url_for('roles.list', role=role))
    except InvalidEntity:
        kwargs = client.role_template_data(role, netid, invalid=True)
        return flask.render_template('role.html', **kwargs), 400


@bp.route('/<role>/revoke', endpoint='revoke', methods=['POST'])
@require_qualified
@require_login
def role_revoke(netid, client, role):
    entity = flask.request.form['entity']
    granted_by = client.role_granted_by(role, entity)
    if client.check_role('admin', netid) or (granted_by and netid == granted_by):
        client.revoke_role(role, entity)
        return flask.redirect(flask.url_for('roles.list', role=role))
    kwargs = client.role_template_data(role, netid, invalid=True)
    return flask.render_template('role.html', **kwargs), 403
