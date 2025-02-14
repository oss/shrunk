import os
from typing import Any, Dict, List, Optional

import pymongo
from bson import ObjectId
from flask import render_template_string
from flask_mailman import Mail

__all__ = ["TicketsClient"]

REASON_CODES = {
    "power_user": "PU",
    "whitelisted": "WL",
    "other": "OT",
}
CATEGORY_TO_SUBJECT = {
    "confirmation": "Ticket Submitted",
    "notification": "New Pending Ticket",
    "resolution": "Ticket Resolved",
    "closed": "Ticket Closed Without Resolution",
}

Ticket = Dict[str, Any]


class TicketsClient:
    """This class implements the help desk ticketing system"""

    def __init__(
        self,
        db: pymongo.database.Database,
        HELP_DESK_ENABLED: bool,
        SLACK_INTEGRATION_ENABLED: bool,
        SLACK_BOT_TOKEN: str,
        SLACK_SHRUNK_CHANNEL_ID: str,
    ):
        self.db = db
        self.help_desk_enabled = HELP_DESK_ENABLED
        self.slack_integration_enabled = SLACK_INTEGRATION_ENABLED
        self.slack_bot_token = SLACK_BOT_TOKEN
        self.slack_shrunk_channel_id = SLACK_SHRUNK_CHANNEL_ID

    def get_help_desk_enabled(self) -> bool:
        """Getter for help_desk_enabled.

        :return: True if the help desk is enabled, False otherwise
        """
        return self.help_desk_enabled

    def get_slack_integration_enabled(self) -> bool:
        """Getter for slack_integration_enabled.

        :return: True if the slack integration is enabled, False otherwise
        """
        return self.slack_integration_enabled

    def get_slack_bot_token(self) -> str:
        """Getter for slack_bot_token

        :return: the slack bot token
        """
        return self.slack_bot_token

    def get_slack_shrunk_channel_id(self) -> str:
        """Getter for slack_shrunk_channel_id.

        :return: the slack shrunk channel ID
        """
        return self.slack_shrunk_channel_id

    def get_help_desk_text(self) -> Dict[str, str]:
        """Get the text-related attributes needed for messages, emails, and
        forms.

        :return: a dictionary with the text-related attributes
        """
        return {
            "reason": {
                "power_user": {
                    "prompt": (
                        "Power users have the ability to create custom aliases"
                        " for their shortened links. The power user role will "
                        "only be granted to faculty/staff members. Your "
                        "ticket will be manually processed to ensure that "
                        "you meet the criteria."
                    ),
                    "placeholder": (
                        "Please provide a brief explanation of why you need "
                        "the power user role."
                    ),
                    "name": "Grant power user role to self",
                },
                "whitelisted": {
                    "prompt": (
                        "Only whitelisted users have access to Go services. "
                        "To whitelist another person, please provide their "
                        "NetID. Your ticket will be manually processed based "
                        "on the comment provided."
                    ),
                    "placeholder": (
                        "Please provide a brief explanation of why you need to"
                        " whitelist this person."
                    ),
                    "name": "Whitelist another person to Go services",
                },
                "other": {
                    "prompt": (
                        "Please provide a brief description of your issue or "
                        "request. This includes issues you have with Go, "
                        "suggestions on how we can improve the site, etc. "
                        "Your ticket will be manually processed."
                    ),
                    "placeholder": (
                        "Please provide a brief description of your issue or "
                        "request."
                    ),
                    "name": "Other",
                },
            },
        }

    def send_help_desk_email(
        self,
        mail: Mail,
        ticket_id: str,
        category: str,
    ):
        """Send an email to the help desk with the ticket ID and action.

        :param ticket_id: the ID of the ticket
        :param category: the category of the ticket
        """
        ticket = self.get_ticket({"_id": ticket_id})

        # Construct the email
        SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
        HTML_TEMPLATE_PATH = os.path.join(
            SCRIPT_DIR, "../static/html/tickets", f"{category}.html"
        )
        PLAINTEXT_TEMPLATE_PATH = os.path.join(
            SCRIPT_DIR, "../static/txt/tickets", f"{category}.txt"
        )

        from_email = "go-support@oit.rutgers.edu"
        recipient_list = [f"{ticket['reporter']}@rutgers.edu"]
        subject = (
            f"Go: Rutgers University URL Shortener - {CATEGORY_TO_SUBJECT[category]}"
        )

        variables = ticket
        if "is_role_granted" in ticket:
            variables["role_request_status"] = (
                "APPROVED" if ticket["is_role_granted"] else "DENIED"
            )

        if category == "notification":
            recipient_list = ["oss@oit.rutgers.edu"]  # Send to OSS team

        with open(HTML_TEMPLATE_PATH, "r", encoding="utf-8") as file:
            html_content = file.read()
        html_message = render_template_string(html_content, **variables)

        with open(PLAINTEXT_TEMPLATE_PATH, "r", encoding="utf-8") as file:
            plaintext_content = file.read()
        body = render_template_string(plaintext_content, **variables)

        # Send the email
        mail.send_mail(
            subject=subject,
            body=body,
            html_message=html_message,
            from_email=from_email,
            recipient_list=recipient_list,
        )

    def create_ticket(self, data: dict) -> str:
        """Create a ticket with the given data.

        :param data: the data for the new ticket

        :return: the ticket
        """
        result = self.db.tickets.insert_one(data)

        return self.get_ticket({"_id": result.inserted_id})

    def update_ticket(self, query: dict, data: dict):
        """Update an existing ticket

        :param query: the query to match the ticket
        :param data: the data to update the ticket with
        """
        if "_id" in query and isinstance(query["_id"], str):
            query["_id"] = ObjectId(query["_id"])

        self.db.tickets.update_one(query, {"$set": data})

    def get_ticket(self, query: dict) -> Optional[Ticket]:
        """Get a single ticket that matches the given criteria.

        :param query: the query to match the ticket

        :return: the ticket or None if no ticket matches the criteria
        """
        if "_id" in query and isinstance(query["_id"], str):
            query["_id"] = ObjectId(query["_id"])

        return self.db.tickets.find_one(query)

    def get_tickets(
        self, query: dict, sort: Optional[List[tuple]] = None
    ) -> List[Ticket]:
        """Get all tickets that match the given criteria and sort them if
        needed.

        :param query: the query to match the tickets
        :param sort: a list of tuples to sort the tickets by

        :return: a list of tickets
        """
        if "_id" in query and isinstance(query["_id"], str):
            query["_id"] = ObjectId(query["_id"])

        return list(self.db.tickets.find(query, sort=sort))

    def count_tickets(self, query: dict) -> int:
        """Count the number of tickets that match the given criteria.

        :param query: the query to match the tickets

        :return: the number of tickets that match the criteria
        """
        return self.db.tickets.count_documents(query)
