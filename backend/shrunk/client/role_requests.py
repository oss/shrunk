from datetime import datetime, timezone
from typing import List, Optional, Any

from .exceptions import InvalidEntity

import pymongo

__all__ = ['RoleRequestClient']

class RoleRequestClient:
    """This class implements the Shrunk role request system"""
    
    def __init__(self, db: pymongo.database.Database):
        self.db = db
    
    def get_pending_role_requests(self, role: str) -> List[Any]:
        """Get all pending role requests for a role
        
        :param role: Role requested
        
        :returns: A list of pending role requests in the form
        
        .. code-block:: json
        
            {
                "role": "string",
                "entity": "string",
                "title": "string",
                "employee_types": ["string", "string", ...],
                "comment": "string",
                "time_requested": DateTime,
            }
        
        """
        return list(self.db.role_requests.find({'role': role}))
    
    def get_pending_role_request_for_entity(self, role: str, entity: str) -> dict:
        """Get a single pending role requests for a role and entity
        
        :param role: Role requested
        :param entity: Identifier of entity requesting role
        
        :returns: A pending role request in the form
        
        .. code-block:: json
            
                {
                    "role": "string",
                    "entity": "string",
                    "comment": "string",
                    "time_requested": DateTime,
                }
                
        """
        return self.db.role_requests.find_one({'role': role, 'entity': entity})
    
    def request_role(self, role: str, entity: str, comment: Optional[str] = None) -> None:
        """ 
        Request a role for an entity
        
        :param role: Role to request
        :param entity: Identifier of entity requesting role
        :param comment: Comment, if required
        
    
        """
        self.db.role_requests.insert_one({
            'role': role,
            'entity': entity,
            'comment': comment if comment is not None else '',
            'time_requested': datetime.now(timezone.utc),
        })
    
    def grant_role_request(self, role: str, grantor: str, grantee: str, comment: Optional[str] = None) -> None:
        """
        Gives a role to grantee and remembers who did it. Delete the request from the database.

        :param role: Role to grant
        :param grantor: Identifier of entity granting role
        :param grantee: Entity to which role should be granted
        :param comment: Comment, if required

        :raises InvalidEntity: If the entity fails validation
        """
        self.db.role_requests.delete_one({'role': role, 'entity': grantee})

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
        
    def deny_role_request(self, role: str, grantee: str) -> None:
        """
        Deny a role request and remember who did it. Delete the request from the database.

        :param role: Role to deny
        :param grantor: Identifier of entity denying role
        :param grantee: Entity to which role should be denied
        :param comment: Comment, if required
        """
        self.db.role_requests.delete_one({'role': role, 'entity': grantee})

        
    
