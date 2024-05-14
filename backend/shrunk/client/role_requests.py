import time
from typing import Any, Dict, List

import pymongo
from flask_mailman import Mail
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

from shrunk.util.ldap import query_position_info

__all__ = ["RoleRequestClient"]


class RoleRequestClient:
    """This class implements the Shrunk role request system"""

    def __init__(
        self,
        db: pymongo.database.Database,
        SEND_MAIL_ON: bool,
        SLACK_INTEGRATION_ON: bool,
        SLACK_BOT_TOKEN: str,
        SLACK_SHRUNK_CHANNEL_ID: str,
    ):
        self.db = db
        self.send_mail_on = SEND_MAIL_ON
        self.slack_integration_on = SLACK_INTEGRATION_ON
        self.slack_bot_token = SLACK_BOT_TOKEN
        self.slack_shrunk_channel_id = SLACK_SHRUNK_CHANNEL_ID

    def get_pending_role_requests(self, role: str) -> List[Any]:
        """Get all pending role requests for a role

        :param role: The internal name for the role

        :returns: A list of pending role requests, where each request is formatted as follows:

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
        return list(self.db.role_requests.find({"role": role}))

    def get_pending_role_requests_count(self, role: str) -> int:
        """Get the count of all pending role requests for a role

        :param role: Role requested

        :returns: The count of pending role requests

        """
        return self.db.role_requests.count_documents({"role": role})

    def get_pending_role_request_for_entity(self, role: str, entity: str) -> dict:
        """Get a single pending role requests for a role and entity

        :param role: Role requested
        :param entity: The NetID of the user requesting the role

        :returns: A pending role request in the form

        .. code-block:: json

                {
                    "role": "string",
                    "entity": "string",
                    "comment": "string",
                    "time_requested": DateTime,
                }

        """
        return self.db.role_requests.find_one({"role": role, "entity": entity})

    def create_role_request(self, role: str, entity: str, comment: str) -> None:
        """
        Request a role for an entity

        :param role: Role to request
        :param entity: The NetID of the user requesting the role
        :param comment: The comment the user provided with their request


        """
        timestamp = str(time.time())
        self.db.role_requests.insert_one(
            {
                "role": role,
                "entity": entity,
                "comment": comment,
                "time_requested": timestamp,
            }
        )

    def delete_role_request(self, role: str, entity: str) -> None:
        """
        Delete a role request and remember who did it. Delete the request from the database.

        :param role: Role to request
        :param entity: The NetID of the user requesting the role
        :param comment: The comment the admin should provide with their decision
        """
        self.db.role_requests.delete_one({"role": role, "entity": entity})

    def get_role_request_text(self, role: str) -> Any:
        """Get the text for a role request form.

        :param role: The internal name for the role
        """
        if role == "power_user":
            return {
                "capitalized_role": "Power User",
                "uppercase_role": "POWER USER",
                "role": "power user",
                "prompt": "Power users have the ability to create custom aliases for their shortened links. To request the power user role, please fill in and submit the form below. The power user role will only be granted to faculty/staff members. Your request will be manually processed to ensure that you meet this requirement.",
                "placeholder_text": "Please provide a brief explanation of why you need the power user role.",
                "submit_button": "Request power user role",
            }

        # TODO: Implement this function for all roles. Currently only implemented for power_user

        return None

    def send_role_request_confirmation_mail(
        self, role: str, entity: str, mail: Mail
    ) -> None:
        """Send an email to the requesting-user confirming that a role request has been sent to be manually processed.

        :param role: Role to request
        :param entity: The NetID of the user requesting the role
        :param mail: The mail object
        """
        display_attributes = self.get_role_request_text(role)
        uppercase_role_name = display_attributes["uppercase_role"]

        plaintext_message = f"""
        
        
        Dear {entity},
        
        This email is to confirm that your request for the {uppercase_role_name} role has been sent. Please wait for your request to be processed, as an admin needs to manually check whether you meet the necessary requirements for this role. You will receive another email on your request's approval/denial.
        
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
                <p>Dear {entity},</p>

                <p>This email is to confirm that your request for the <span class="requested-role">{uppercase_role_name}</span> role has been sent. Please wait for your request to be processed, as an admin needs to manually check whether you meet the necessary requirements for this role. You will receive another email on your request's approval/denial.</p>
                
                <p>Thank you for your interest and usage of go.rutgers.edu, the official URL shortener of Rutgers, The State University of New Jersey.</p>
                
                <p>Sincerely,</p>
                <p>The OSS Team</p>

                <p><i>Please do not reply to this email. You may direct any questions to
                <a href="mailto:oss@oit.rutgers.edu">oss@oit.rutgers.edu</a>.</i></p>
            </body>
        </html>

        """

        mail.send_mail(
            subject=f"Go: Rutgers University URL Shortener - Your {uppercase_role_name} Role Request Has Been Sent",
            body=plaintext_message,
            html_message=html_message,
            from_email="noreply@go.rutgers.edu",
            recipient_list=[f"{entity}@rutgers.edu"],
        )

    def send_role_request_approval_mail(
        self, role: str, entity: str, comment: str, mail: Mail
    ) -> None:
        """Send an email to the requesting-user confirming that their role request is approved.

        :param role: The role requested
        :param entity: The NetID of the user requesting the role
        :param comment: Comment from the admin
        :param mail: The mail object
        """
        display_attributes = self.get_role_request_text(role)
        uppercase_role_name = display_attributes["uppercase_role"]

        plaintext_message = f"""
        
        
        Dear {entity},
        
        Your request for the {uppercase_role_name} role has been approved. You now have the ability to create custom aliases for your shortened links.
        
        Comment: {comment}
        
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
                <p>Dear {entity},</p>

                <p>Your request for the <span class="requested-role">{uppercase_role_name}</span> role has been approved. You now have the ability to create custom aliases for your shortened links.</p>
                
                <p>Comment: {comment}</p>
                
                <p>Thank you for your interest and usage of go.rutgers.edu, the official URL shortener of Rutgers, The State University of New Jersey.</p>
                
                <p>Sincerely,</p>
                <p>The OSS Team</p>

                <p><i>Please do not reply to this email. You may direct any questions to
                <a href="mailto:oss@oit.rutgers.edu">oss@oit.rutgers.edu</a>.</i></p>
            </body>
        </html>
        
        """

        mail.send_mail(
            subject=f"Go: Rutgers University URL Shortener - Your {uppercase_role_name} Role Request Has Been Approved",
            body=plaintext_message,
            html_message=html_message,
            from_email="noreply@go.rutgers.edu",
            recipient_list=[f"{entity}@rutgers.edu"],
        )

    def send_role_request_denial_mail(
        self, role: str, entity: str, comment: str, mail: Mail
    ) -> None:
        """Send an email to the requesting-user confirming that their role request is denied.

        :param role: The role requested
        :param entity: The NetID of the user requesting the role
        :param comment: Comment from the admin
        :param mail: The mail object
        """
        display_attributes = self.get_role_request_text(role)
        uppercase_role_name = display_attributes["uppercase_role"]

        plaintext_message = f"""
        
        
        Dear {entity},
        
        Your request for the {uppercase_role_name} role has been denied.
        
        Comment: {comment}
        
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
                <p>Dear {entity},</p>

                <p>This email is to confirm that your request for the <span class="requested-role">{uppercase_role_name}</span> role has been approved. You now have the ability to create custom aliases for your shortened links.</p>
                
                <p>Comment: {comment}</p>
                
                <p>Thank you for your interest and usage of go.rutgers.edu, the official URL shortener of Rutgers, The State University of New Jersey.</p>
                
                <p>Sincerely,</p>
                <p>The OSS Team</p>

                <p><i>Please do not reply to this email. You may direct any questions to
                <a href="mailto:oss@oit.rutgers.edu">oss@oit.rutgers.edu</a>.</i></p>
            </body>
        </html>
        
        """

        mail.send_mail(
            subject=f"Go: Rutgers University URL Shortener - Your {uppercase_role_name} Role Request Has Been Approved",
            body=plaintext_message,
            html_message=html_message,
            from_email="noreply@go.rutgers.edu",
            recipient_list=[f"{entity}@rutgers.edu"],
        )

    def send_role_request_notification_mail(
        self, role: str, entity: str, mail: Mail
    ) -> None:
        """Send an email to the OSS team notifying them that a role request has been made.

        :param requesting_netid: NetID of the requesting user
        :param mail: The mail object
        :param role_name: The role name being requested
        """
        display_attributes = self.get_role_request_text(role)
        uppercase_role_name = display_attributes["uppercase_role"]

        plaintext_message = f"""
        
        

        
        The user {entity} has requested the {uppercase_role_name} role. Please process their request.
        
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
                <p>The user {entity} has requested the <span class="requested-role">{uppercase_role_name}</span> role. Please process their request.</p>

                <p><i>Please do not reply to this email. You may direct any questions to
                <a href="mailto:oss@oit.rutgers.edu">oss@oit.rutgers.edu</a>.</i></p>
            </body>
        </html>

        """

        mail.send_mail(
            subject=f"Go: Rutgers University URL Shortener - New Pending Role Request for {uppercase_role_name} Role",
            body=plaintext_message,
            html_message=html_message,
            from_email="noreply@go.rutgers.edu",
            recipient_list=["oss@oit.rutgers.edu"],
        )

    def get_send_mail_on(self) -> bool:
        """Get the value of the send_mail_on attribute. This is to adjust the modal message for the user after they submit a role request."""
        return self.send_mail_on

    def get_slack_integration_on(self) -> bool:
        """Get the value of the slack_integration_on attribute. This is to adjust the modal message for the user after they submit a role request."""
        return self.slack_integration_on

    def generate_role_request_component(self, role: str, entity: str) -> Dict[str, Any]:
        """
        Generate the role request component needed for shrunk to send a formatted, interactive Slack message.

        Args:
        :param role: The role name being requested
        :param entity: NetID of the requesting user

        Returns:
        :returns: A dictionary containing the blocks needed for the Slack message and a plaintext message. The `blocks` field of the message should be initialized to the `blocks` attribute and the `text` field respectively.
        """
        # Get the display attributes for the role request
        display_attributes = self.get_role_request_text(role)
        uppercase_role_name = display_attributes["uppercase_role"]

        # Get the position info of the requesting user using LDAP. If the user's position info cannot be found, display an error message. If a specific attribute cannot be found, display "N/A".
        intermediate_position_info = query_position_info(entity)
        attributes = ["title", "rutgersEduStaffDepartment", "employeeType"]
        position_info = dict()
        if not intermediate_position_info:
            position_info = {attr: ["Cannot find attribute"] for attr in attributes}
        else:
            for attr in attributes:
                if attr in intermediate_position_info.keys() and intermediate_position_info[attr]:
                    position_info[attr] = intermediate_position_info[attr]
                else:
                    position_info[attr] = ["N/A"]

        # Generate the blocks
        blocks = [
            {
                "type": "section",
                "block_id": "role_request_prompt",
                "text": {
                    "type": "mrkdwn",
                    "text": "The user *{}* has requested the {} role. Please process their request:".format(
                        entity, uppercase_role_name
                    ),
                },
            },
            {
                "type": "section",
                "block_id": "role_request_position_info",
                "text": {
                    "type": "mrkdwn",
                    "text": "*Title(s):* {}\n*Department(s):* {}\n*Employee Type(s):* {}\n*Comment:* {}".format(
                        ", ".join(position_info["title"]),
                        ", ".join(position_info["rutgersEduStaffDepartment"]),
                        ", ".join(position_info["employeeType"]),
                        self.get_pending_role_request_for_entity(role, entity).get("comment", "N/A"), # should never be N/A since the comment is required
                    ),
                },
            },
            {"type": "divider"},
            {
                "type": "input",
                "block_id": "role_request_comment_input",
                "element": {
                    "type": "plain_text_input",
                    "multiline": True,
                    "action_id": "comment_input",
                    "max_length": 500
                },
                "label": {
                    "type": "plain_text",
                    "text": "Include an approval/denial comment (optional):",
                },
            },
            {
                "type": "actions",
                "block_id": "role_request_actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Approve",
                        },
                        "style": "primary",
                        "value": "{}|{}".format(role, entity),
                        "action_id": "rra_button_click"
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Deny"},
                        "style": "danger",
                        "value": "{}|{}".format(role, entity),
                        "action_id": "rrd_button_click"
                    },
                ],
            },
        ]

        # Generate plaintext summary
        text = f"A role request has been made by {entity} for the role {role}."

        return {"blocks": blocks, "text": text}

    def send_role_request_notification_slack(self, role: str, entity: str) -> None:
        """Send a message to the OSS team's Slack channel notifying them that a role request has been made. This should also update the time_requested field of the role request to the timestamp of the slack message.

        :param role: The role name being requested
        :param entity: NetID of the requesting user
        """

        component = self.generate_role_request_component(role, entity)
        blocks = component["blocks"]
        text = component["text"]
        client = WebClient(token=self.slack_bot_token)

        try:
            response = client.chat_postMessage(
                channel=self.slack_shrunk_channel_id, text=text, blocks=blocks
            )
            message_timestamp = response["ts"]
            self.db.role_requests.update_one(
                {"role": role, "entity": entity},
                {"$set": {"time_requested": message_timestamp}},
            )
        except SlackApiError as e:
            print(f"Got an error: {e.response['error']}")

    def delete_role_request_notification_slack(
        self, role: str, entity: str, approved: bool
    ) -> None:
        """Delete the role request notification message from the OSS team's Slack channel. This occurs either if the role request was handled within shrunk or handled within Slack.

        :param role: The role name being requested
        :param entity: NetID of the requesting user
        :param approved: Whether the role request was approved or denied
        """
        client = WebClient(token=self.slack_bot_token)
        role_request = self.db.role_requests.find_one({"role": role, "entity": entity})
        message_timestamp = role_request["time_requested"]

        # Get the display attributes for the role request
        display_attributes = self.get_role_request_text(role)
        uppercase_role_name = display_attributes["uppercase_role"]

        if approved:
            text = f"The {uppercase_role_name} role request from *{entity}* was approved"
        else:
            text = f"The {uppercase_role_name} role request from *{entity}* was denied"

        try:
            client.chat_update(
                channel=self.slack_shrunk_channel_id,
                ts=message_timestamp,
                text=text,
            )
        except SlackApiError as e:
            print(f"Got an error: {e.response['error']}")
