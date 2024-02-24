from datetime import datetime, timezone
from typing import List, Optional, Any

from .exceptions import InvalidEntity

import pymongo

from flask_mailman import Mail

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
        
    def delete_role_request(self, role: str, entity: str) -> None:
        """
        Delete a role request and remember who did it. Delete the request from the database.

        :param role: Role to deny
        :param entity: Entity to which role should be denied
        :param comment: Comment, if required
        """
        self.db.role_requests.delete_one({'role': role, 'entity': entity})
        
    @staticmethod
    def get_role_request_text(role: str) -> Any:
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
    
    @staticmethod
    def send_role_request_confirmation(requesting_netid: str, mail: Mail, role_name: str) -> None:
        display_role_name = ''
        if role_name == 'power_user':
            display_role_name = 'power user'
            capitalized_role_name = 'Power User'
        plaintext_message = f"""
        
        
        Dear {requesting_netid},
        
        This email is to confirm your request for the {display_role_name} role. Please wait for your request to be processed, as an admin needs to manually check whether you meet the necessary requirements for this role. You will receive another email on your request's approval/denial.
        
        Thank you for your interest and usage of go.rutgers.edu, the official URL shortener of Rutgers, The State University of New Jersey.
        
        Sincerely,
        The OSS Team
        
        Please do not reply to this email. You may direct any questions to oss@oit.rutgers.edu.
        
        """
        
        html_message = f"""
        
        <!DOCTYPE html>
        <html lang="en-US">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <style>
                    * {{
                        font-family: Arial, sans-serif;
                    }}

                    .requested-role {{
                        font-weight: bold;
                    }}
                </style>
            </head>
            <body>
                <p>Dear {requesting_netid},</p>

                <p>This email is to confirm your request for the <span class="requested-role">{display_role_name}</span> role. Please wait for your request to be processed, as an admin needs to manually check whether you meet the necessary requirements for this role. You will receive another email on your request's approval/denial.</p>
                
                <p>Thank you for your interest and usage of go.rutgers.edu, the official URL shortener of Rutgers, The State University of New Jersey.</p>
                
                <p>Sincerely,</p>
                <p>The OSS Team</p>

                <p><i>Please do not reply to this email. You may direct any questions to
                <a href="mailto:oss@oit.rutgers.edu">oss@oit.rutgers.edu</a>.</i></p>
            </body>
        </html>

        """
        
        mail.send_mail(
            subject=f'Go: Rutgers University URL Shortener - {capitalized_role_name} Role Request Confirmation',
            body=plaintext_message,
            html_message=html_message,
            from_email='noreply@go.rutgers.edu',
            recipient_list=[f'{requesting_netid}@rutgers.edu'],
        )
        
    @staticmethod
    def send_role_request_approval(requesting_netid: str, mail: Mail, role_name: str) -> None:
        display_role_name = ''
        if role_name == 'power_user':
            display_role_name = 'power user'
            capitalized_role_name = 'Power User'
        plaintext_message = f"""
        
        
        Dear {requesting_netid},
        
        This email is to confirm that your request for the {display_role_name} role has been approved. You now have the ability to create custom aliases for your shortened links.
        
        Thank you for your interest and usage of go.rutgers.edu, the official URL shortener of Rutgers, The State University of New Jersey.
        
        Sincerely,
        The OSS Team
        
        Please do not reply to this email. You may direct any questions to oss@oit.rutgers.edu.
        
        """
        
        html_message = f"""
        
        <!DOCTYPE html>
        <html lang="en-US">
            <head>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
                <style>
                    * {{
                        font-family: Arial, sans-serif;
                    }}

                    .requested-role {{
                        font-weight: bold;
                    }}
                </style>
            </head>
            <body>
                <p>Dear {requesting_netid},</p>

                <p>This email is to confirm that your request for the <span class="requested-role">{display_role_name}</span> role has been approved. You now have the ability to create custom aliases for your shortened links.</p>
                
                <p>Thank you for your interest and usage of go.rutgers.edu, the official URL shortener of Rutgers, The State University of New Jersey.</p>
                
                <p>Sincerely,</p>
                <p>The OSS Team</p>

                <p><i>Please do not reply to this email. You may direct any questions to
                <a href="mailto:oss@oit.rutgers.edu">oss@oit.rutgers.edu</a>.</i></p>
            </body>
        </html>
        
        """
        
        mail.send_mail(
            subject=f'Go: Rutgers University URL Shortener - Your {capitalized_role_name} Role Request Has Been Approved',
            body=plaintext_message,
            html_message=html_message,
            from_email='noreply@go.rutgers.edu',
            recipient_list=[f'{requesting_netid}@rutgers.edu'],
        )


        



        
    
