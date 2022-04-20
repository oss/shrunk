"""Implements the :py:class:`RolesClient` class."""

from datetime import datetime, timezone
from typing import Callable, Optional, List, Dict, Any

from flask import current_app, has_app_context
import pymongo

from .exceptions import InvalidEntity

__all__ = ['RolesClient']


class RolesClient:
    """This class implements the Shrunk roles system."""

    def __init__(self, *, db: pymongo.database.Database):
        self.db = db
        self.qualified_for: Dict[str, Callable[[str], bool]] = {}
        self.process_entity: Dict[str, Callable[[str], str]] = {}
        self.valid_entity_for: Dict[str, Callable[[str], bool]] = {}
        self.oncreate_for: Dict[str, Callable[[str], None]] = {}
        self.onrevoke_for: Dict[str, Callable[[str], None]] = {}
        self.form_text: Dict[str, Any] = {}

    @staticmethod
    def _default_text(role: str) -> Any:
        """Get the default text that apears in a role menu.

        :param role: Role name
        """
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
            'allow_comment': False,
            'comment_prompt': 'Comment',
        }

    def create(self,
               role: str,
               qualifier_func: Callable[[str], bool],
               validator_func: Callable[[str], bool] = lambda e: e != '',
               custom_text: Any = None,
               oncreate: Callable[[str], None] = lambda _: None,
               onrevoke: Callable[[str], None] = lambda _: None,
               process_entity: Callable[[str], str] = lambda e: e) -> None:
        """
        :param role: Role name

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
        :param process_entity:
            callback to transform entity before it's inserted into the db
        """

        custom_text = custom_text or {}
        text = self._default_text(role)
        text.update(custom_text)
        self.form_text[role] = text
        self.qualified_for[role] = qualifier_func
        self.process_entity[role] = process_entity
        self.valid_entity_for[role] = validator_func
        self.oncreate_for[role] = oncreate
        self.onrevoke_for[role] = onrevoke

    def exists(self, role: str) -> bool:
        """Check whether a role exists.

        :param role: Role name
        """
        return role in self.oncreate_for

    def grant(self, role: str, grantor: str, grantee: str, comment: Optional[str] = None) -> None:
        """
        Gives a role to grantee and remembers who did it

        :param role: Role to grant
        :param grantor: Identifier of entity granting role
        :param grantee: Entity to which role should be granted
        :param comment: Comment, if required

        :raises InvalidEntity: If the entity fails validation
        """

        if self.exists(role) and self.is_valid_entity_for(role, grantee):
            if role in self.process_entity:
                grantee = self.process_entity[role](grantee)

            # guard against double insertions
            if not self.has(role, grantee):
                self.db.grants.insert_one({
                    'role': role,
                    'entity': grantee,
                    'granted_by': grantor,
                    'comment': comment if comment is not None else '',
                    'time_granted': datetime.now(timezone.utc),
                })
                if role in self.oncreate_for:
                    self.oncreate_for[role](grantee)
        else:
            raise InvalidEntity

    def revoke(self, role: str, entity: str) -> None:
        """Revoke a role from an entity

        :param role: Role name
        :param entity: The entity
        """
        if has_app_context():
            current_app.logger.info(f'revoking role {role} for {entity}')
        if role in self.onrevoke_for:
            self.onrevoke_for[role](entity)
        self.db.grants.delete_one({'role': role, 'entity': entity})

    def has(self, role: str, entity: str) -> bool:
        """Check whether an entity has a role

        :param role: Role name
        :param entity: The entity
        """
        return self.db.grants.find_one({'role': role, 'entity': entity}) is not None

    def has_some(self, roles: List[str], entity: str) -> bool:
        """Check whether an entity has at least one of the roles in the list

        :param roles: The roles to check
        :param entity: The entity
        """
        return any(self.has(role, entity) for role in roles)

    def get_role_names(self) -> List[Any]:
        """Get name and display name of all roles

        :returns: A list of objects of the form

        .. code-block:: json

           { "name": "string", "display_name": "string" }
        """
        return [{'name': name, 'display_name': info['title']}
                for (name, info) in self.form_text.items()]

    def get_role_entities(self, role: str) -> List[Any]:
        """Get all entities having the given role

        :param role: Role name
        """
        return list(self.db.grants.find({'role': role}))

    def get_role_text(self, role: str) -> Any:
        """Get the form text for a given role

        :param role: Role name
        """
        return self.form_text[role]

    def is_valid_entity_for(self, role: str, entity: str) -> bool:
        """Check whether an entity is valid for a role

        :param role: Role name
        :param entity: The entity
        """
        if role in self.valid_entity_for:
            return self.valid_entity_for[role](entity)
        return True
