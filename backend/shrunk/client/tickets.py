import os
from typing import Any, Dict, List, Optional

import pymongo
import pymongo.database
from bson import ObjectId
from flask import render_template_string
from flask_mailman import Mail
from typing_extensions import TypedDict

from shrunk.mongo_schema import TicketDocument

__all__ = ["TicketsClient"]


class TicketReasonText(TypedDict):
    prompt: str
    placeholder: str
    name: str


class HelpDeskText(TypedDict):
    reason: Dict[str, TicketReasonText]


CATEGORY_TO_SUBJECT = {
    "confirmation": "Ticket Submitted",
    "notification": "New Pending Ticket",
    "resolution": "Ticket Resolved",
    "closed": "Ticket Closed Without Resolution",
}


class TicketsClient:
    """This class implements the help desk ticketing system"""

    def __init__(self, db: pymongo.database.Database):
        self.db = db

    def get_help_desk_enabled(self) -> bool:
        """Getter for help_desk_enabled.

        :return: True if the help desk is enabled, False otherwise
        """
        return bool(int(os.getenv("SHRUNK_HELP_DESK_ENABLED", "0")))

    def get_help_desk_text(self) -> HelpDeskText:
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
                    "placeholder": ("Please provide a brief explanation of why you need the power user role."),
                    "name": "Grant power user role to self",
                },
                "whitelisted": {
                    "prompt": (
                        "Only whitelisted users have access to Go services. "
                        "To whitelist another person, please provide their "
                        "NetID. Your ticket will be manually processed based "
                        "on the comment provided."
                    ),
                    "placeholder": ("Please provide a brief explanation of why you need to whitelist this person."),
                    "name": "Whitelist another person to Go services",
                },
                "other": {
                    "prompt": (
                        "Please provide a brief description of your issue or "
                        "request. This includes issues you have with Go, "
                        "suggestions on how we can improve the site, etc. "
                        "Your ticket will be manually processed."
                    ),
                    "placeholder": ("Please provide a brief description of your issue or request."),
                    "name": "Other",
                },
            },
        }

    def send_help_desk_email(
        self,
        mail: Mail,
        ticket_id: str,
        category: str,
    ) -> None:
        """Send an email to the help desk with the ticket ID and action.

        :param ticket_id: the ID of the ticket
        :param category: the category of the ticket
        """
        ticket = self.get_ticket({"_id": ticket_id})
        assert ticket is not None

        # Construct the email
        SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
        HTML_TEMPLATE_PATH = os.path.join(SCRIPT_DIR, "../static/html/tickets", f"{category}.html")
        PLAINTEXT_TEMPLATE_PATH = os.path.join(SCRIPT_DIR, "../static/txt/tickets", f"{category}.txt")

        from_email = "go-support@oit.rutgers.edu"
        recipient_list = [f"{ticket['reporter']}@rutgers.edu"]
        subject = f"Go: Rutgers University URL Shortener - {CATEGORY_TO_SUBJECT[category]}"

        variables: Dict[str, Any] = dict(ticket)
        if "is_role_granted" in ticket:
            variables["role_request_status"] = "APPROVED" if ticket["is_role_granted"] else "DENIED"

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
            message=body,
            html_message=html_message,
            from_email=from_email,
            recipient_list=recipient_list,
        )

    def create_ticket(self, data: dict) -> TicketDocument:
        """Create a ticket with the given data.

        :param data: the data for the new ticket

        :return: the ticket
        """
        result = self.db.tickets.insert_one(data)

        ticket = self.get_ticket({"_id": result.inserted_id})
        assert ticket is not None
        return ticket

    def update_ticket(self, query: dict, data: dict) -> None:
        """Update an existing ticket

        :param query: the query to match the ticket
        :param data: the data to update the ticket with
        """
        if "_id" in query and isinstance(query["_id"], str):
            query["_id"] = ObjectId(query["_id"])

        self.db.tickets.update_one(query, {"$set": data})

    def get_ticket(self, query: dict) -> Optional[TicketDocument]:
        """Get a single ticket that matches the given criteria.

        :param query: the query to match the ticket

        :return: the ticket or None if no ticket matches the criteria
        """
        if "_id" in query and isinstance(query["_id"], str):
            query["_id"] = ObjectId(query["_id"])

        return self.db.tickets.find_one(query)

    def get_tickets(self, query: dict, sort: Optional[List[tuple]] = None) -> List[TicketDocument]:
        """Get all tickets that match the given criteria and sort them if
        needed.

        :param query: the query to match the tickets
        :param sort: a list of tuples to sort the tickets by

        :return: a list of tickets
        """
        if "_id" in query and isinstance(query["_id"], str):
            query["_id"] = ObjectId(query["_id"])

        return list(self.db.tickets.find(query, sort=sort))

    def delete_ticket(self, query: dict) -> None:
        """Delete a ticket that matches the given criteria.

        :param query: the query to match the ticket
        """
        if "_id" in query and isinstance(query["_id"], str):
            query["_id"] = ObjectId(query["_id"])

        self.db.tickets.delete_one(query)

    def count_tickets(self, query: dict) -> int:
        """Count the number of tickets that match the given criteria.

        :param query: the query to match the tickets

        :return: the number of tickets that match the criteria
        """
        return self.db.tickets.count_documents(query)
