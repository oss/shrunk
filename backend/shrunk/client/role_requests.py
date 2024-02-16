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
    
    def get_pending_role_requests_count(self, role: str) -> int:
        """Get the count of all pending role requests for a role
        
        :param role: Role requested
        
        :returns: The count of pending role requests
        
        """
        return self.db.role_requests.count_documents({'role': role})
    
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
    
    def request_role(self, role: str, entity: str, comment: str) -> None:
        """ 
        Request a role for an entity
        
        :param role: Role to request
        :param entity: Identifier of entity requesting role
        :param comment: Comment, if required
        
    
        """
        self.db.role_requests.insert_one({
            'role': role,
            'entity': entity,
            'comment': comment,
            'time_requested': datetime.now(timezone.utc),
        })
        
    def delete_role_request(self, role: str, entity: str, granted: bool) -> None:
        """
        Delete a role request and remember who did it. Delete the request from the database.

        :param role: Role to deny
        :param entity: Entity to which role should be denied
        :param comment: Comment, if required
        """
        self.db.role_requests.delete_one({'role': role, 'entity': entity})
        
    @staticmethod
    def get_request_text(role: str) -> Any:
        """Get the text for a role request form.

        :param role: Role name
        """
        if role == 'power_user':
            return {
                'capitalized_role': 'Power User',
                'role': 'power user',
                'prompt': 'Power users have the ability to create custom aliases for their shortened links. To request the power user role, please fill in and submit the form below. The power user role will only be granted to faculty/staff members. Your request will be manually processed to ensure that you meet this requirement.',
                'placeholder_text': 'Please provide a brief explanation of why you need the power user role.',
                'submit_button': 'Request power user role',
            }
        return None

        
    
