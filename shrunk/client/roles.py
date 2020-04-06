from typing import Callable, Optional, List, Iterable, Dict

from flask import current_app, has_app_context

# from .. import schema
from .exceptions import InvalidEntity


class RolesClient:
    def __init__(self, **kwargs):
        self.qualified_for: Dict[str, Callable[[str], bool]] = {}
        self.valid_entity_for: Dict[str, Callable[[str], bool]] = {}
        self.oncreate_for: Dict[str, Callable[[str], None]] = {}
        self.onrevoke_for: Dict[str, Callable[[str], None]] = {}
        self.form_text = {}

    def _default_text(self, role: str):
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

    def new_role(self,
                 role: str,
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

        :param custom_text: custom text to show on the form. see :py:func:`_default_text` source for options

        :param oncreate: callback for extra logic when granting a role, e.g. remove a user's links on ban

        :param onrevoke:
        callback for extra logic when revoking a role, e.g. reenabling a user's link when they are unbanned
        """

        text = self._default_text(role)
        text.update(custom_text)
        self.form_text[role] = text
        self.qualified_for[role] = qualifier_func
        self.valid_entity_for[role] = validator_func
        self.oncreate_for[role] = oncreate
        self.onrevoke_for[role] = onrevoke

    def role_form_text(self, role: str):
        return self.form_text[role]

    def grant_role(self, role: str, grantor: str, grantee: str, comment: Optional[str] = None) -> None:
        """
        Gives a role to grantee and remembers who did it

        :param role: Role to grant
        :param grantor: Identifier of entity granting role
        :param grantee: Entity to which role should be granted
        :param comment: Comment, if required

        :raises InvalidEntity: If the entity fails validation
        """

        if self.role_exists(role) and self.is_valid_entity_for_role(role, grantee):
            # guard against double insertions
            if not self.check_role(role, grantee):
                if has_app_context():
                    current_app.logger.info(f'{grantor} grants role {role} to {grantee}')
                self.db.grants.insert_one({
                    'role': role,
                    'entity': grantee,
                    'granted_by': grantor,
                    'comment': comment if comment is not None else ''
                })
                if role in self.oncreate_for:
                    self.oncreate_for[role](grantee)
        else:
            raise InvalidEntity

    def check_role(self, role: str, entity: str) -> bool:
        """Check whether an entity has a role"""

        return bool(self.db.grants.find_one({'role': role, 'entity': entity}))

    def has_some_role(self, roles: List[str], entity: str) -> bool:
        """Check whether an entity has at least one of the roles in the list"""

        return any(self.check_role(role, entity) for role in roles)

    def get_roles(self, entity: str) -> List[str]:
        """Get a list of all the roles an entity has"""

        entity_grants = self.db.grants.find({'entity': entity})
        return [grant['role'] for grant in entity_grants]

    def role_granted_by(self, role: str, entity: str) -> Optional[str]:
        """Determine who granted a role to an entity"""

        grant = self.db.grants.find_one({'role': role, 'entity': entity})
        return grant['granted_by'] if grant else None

    def list_all_entities(self, role: str):  # -> Iterable[schema.Grants]:
        """Get all entities associated with the role"""

        return self.db.grants.find({'role': role})

    def revoke_role(self, role: str, entity: str) -> None:
        """Revoke role from entity"""

        if has_app_context():
            current_app.logger.info(f'revoking role {role} for {entity}')
        if role in self.onrevoke_for:
            self.onrevoke_for[role](entity)
        self.db.grants.delete_one({'role': role, 'entity': entity})

    def role_template_data(self, role: str, netid: str, invalid: bool = False):
        """Get templated data for lisiting entities with a role in the UI"""

        is_admin = self.check_role('admin', netid)
        grants = self.list_all_entities(role)
        if not is_admin:
            grants = [g for g in grants if g['granted_by'] == netid]
        data = {
            'role': role,
            'grants': list(grants)
        }
        if invalid:
            data['msg'] = self.form_text[role]['invalid']
        data.update(self.form_text[role])
        data.update({
            'admin': is_admin,
            'power_user': self.check_role('power_user', netid),
            'facstaff': self.check_role('facstaff', netid)
        })
        return data

    def role_exists(self, role: str) -> bool:
        """Check whether a role exists"""

        return role in self.qualified_for

    def valid_roles(self) -> List[str]:
        """Get a list of valid roles"""

        return list(self.qualified_for)

    def is_valid_entity_for_role(self, role: str, netid: str) -> bool:
        return self.valid_entity_for[role](netid)

    def is_qualified_for_role(self, role: str, netid: str) -> bool:
        return self.qualified_for[role](netid)
