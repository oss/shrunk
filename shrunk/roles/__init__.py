from typing import Any, Callable, List, Optional, Iterable

from flask import current_app, has_app_context

from .. import schema

# function hashes
qualified_for = {}
valid_entity_for = {}
oncreate_for = {}
onrevoke_for = {}
form_text = {}
# mongo coll to persist the roles data
grants: Any = None


class NotQualified(Exception):
    pass


class InvalidEntity(Exception):
    pass


def default_text(role: str):
    """Gives the default text that apears in a role menu"""

    return {
        'title': role,
        'invalid': f'invalid entity for role {role}',
        'grant_title': f'Grant {role}',
        'grantee_text': 'Grantee',
        'grant_button': 'GRANT',
        'revoke_title': f'Revoke {role}',
        'revoke_button': 'REVOKE',
        'empty': f'there is currently nothing with the role {role}',
        'granted_by': 'granted by',
        'allow_comment': False
    }


def new(role: str,
        qualifier_func: Callable[[str], bool],
        validator_func: Callable[[str], bool] = lambda e: e != '',
        custom_text={},
        oncreate: Callable[[str], None] = lambda _: None,
        onrevoke: Callable[[str], None] = lambda _: None) -> None:
    """
    :param role: Role name

    :param qualifier_func:
      takes in a netid and returns whether or not a user is qualified to add to a specific role.

    :param validator_func:
      takes in an entity (like netid or link) and returns whether it's valid for a role. for
      example, it could take a link like ``htp://fuz1`` and say it's not a valid link

    :param custom_text: custom text to show on the form. see :py:func:`default_text` source for options

    :param oncreate: callback for extra logic when granting a role, e.g. remove a user's links on ban

    :param onrevoke:
      callback for extra logic when revoking a role, e.g. reenabling a user's link when they are unbanned
    """
    text = default_text(role)
    text.update(custom_text)
    form_text[role] = text
    qualified_for[role] = qualifier_func
    valid_entity_for[role] = validator_func
    oncreate_for[role] = oncreate
    onrevoke_for[role] = onrevoke


def grant(role: str, grantor: str, grantee: str, comment: Optional[str] = None) -> None:
    """
    Gives a role to grantee and remembers who did it

    :param role: Role to grant
    :param grantor: Identifier of entity granting role
    :param grantee: Entity to which role should be granted
    :param comment: Comment, if required

    :raises InvalidEntity: If the entity fails validation
    """

    if exists(role) and valid_entity_for[role](grantee):
        # guard against double insertions
        if not check(role, grantee):
            if has_app_context():
                current_app.logger.info(f'{grantor} grants role {role} to {grantee}')
            grants.insert_one({
                'role': role,
                'entity': grantee,
                'granted_by': grantor,
                'comment': comment if comment is not None else ''
            })
            if role in oncreate_for:
                oncreate_for[role](grantee)
    else:
        raise InvalidEntity


def check(role: str, entity: str) -> bool:
    """Check whether an entity has a role"""

    return bool(grants.find_one({'role': role, 'entity': entity}))


def has_one_of(roles: List[str], entity: str) -> bool:
    """Check whether an entity has at least one of the roles in the list"""

    return any(check(role, entity) for role in roles)


def get(entity: str) -> List[str]:
    """Get a list of all the roles an entity has"""

    entity_grants = grants.find({'entity': entity})
    return [grant['role'] for grant in entity_grants]


def granted_by(role: str, entity: str) -> Optional[str]:
    """Determine who granted a role to an entity"""

    grant = grants.find_one({'role': role, 'entity': entity})
    if not grant:
        return None
    return grant['granted_by']


def list_all(role: str) -> Iterable[schema.Grants]:
    """Get all entities associated with the role"""

    return grants.find({'role': role})


def revoke(role: str, entity: str) -> None:
    """Revoke role from entity"""

    if has_app_context():
        current_app.logger.info(f'revoking role {role} for {entity}')
    if role in onrevoke_for:
        onrevoke_for[role](entity)
    grants.delete_one({'role': role, 'entity': entity})


def template_data(role: str, netid: str, invalid: bool = False):
    """Get templated data for lisiting entities with a role in the UI"""
    is_admin = check('admin', netid)
    grants = list_all(role)
    if not is_admin:
        grants = [g for g in grants if g['granted_by'] == netid]
    data = {
        'role': role,
        'grants': grants
    }
    if invalid:
        data['msg'] = form_text[role]['invalid']
    data.update(form_text[role])
    data['admin'] = is_admin
    data['power_user'] = check('power_user', netid)
    data['facstaff'] = check('facstaff', netid)
    return data


def exists(role: str) -> bool:
    """Check whether a role exists"""

    return role in qualified_for


def valid_roles() -> List[str]:
    """Get a list of valid roles"""

    return list(qualified_for)


def init(app, mongo_client=None, db_name='shrunk'):
    """Init the module, namely get a reference to db"""

    if not mongo_client:
        mongo_client = app.get_shrunk()._mongo
        # this forces pymongo to connect instead of sitting on its hands and blocking
        # the server. idk why it behaves like this but if you remove the next like the
        # server does not respond. pymongo3.6 aug 2018
        mongo_client.admin.command('ismaster')
    global grants
    grants = mongo_client[db_name].grants
