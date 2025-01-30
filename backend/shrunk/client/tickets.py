import os
import time
from typing import Any, Dict, List, Optional

import pymongo
from flask import render_template_string
from flask_mailman import Mail
from bson import ObjectId

__all__ = ["TicketsClient"]


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
        """
        Getter for help_desk_enabled.

        :return: True if the help desk is enabled, False otherwise
        """
        return self.help_desk_enabled

    def get_slack_integration_enabled(self) -> bool:
        """
        Getter for slack_integration_enabled.

        :return: True if the slack integration is enabled, False otherwise
        """
        return self.slack_integration_enabled

    def get_slack_bot_token(self) -> str:
        """
        Getter for slack_bot_token

        :return: the slack bot token
        """
        return self.slack_bot_token

    def get_slack_shrunk_channel_id(self) -> str:
        """
        Getter for slack_shrunk_channel_id.

        :return: the slack shrunk channel ID
        """
        return self.slack_shrunk_channel_id

    def get_help_desk_text(self, reason: str) -> Dict[str, str]:
        """
        Get the text-related attributes needed for messages, emails, and forms.

        :param reason: the reason for the ticket

        :return: a dictionary with the text-related attributes
        """
        data = {
            "201": "We have received your ticket, which will be manually reviewed and resolved.",
            "403": "You are not authorized to submit a ticket.",
            "409": "Either a ticket already exists on this person's behalf or this person already has the requested role.",
            "429": "You have too many pending tickets. Please wait for your existing tickets to be resolved before submitting a new one.",
        }

        if reason == "power_user":
            data.update(
                {
                    "prompt": "Power users have the ability to create custom aliases for their shortened links. The power user role will only be granted to faculty/staff members. Your request will be manually processed to ensure that you meet this requirement.",
                    "placeholder": "Please provide a brief explanation of why you need the power user role.",
                }
            )
        elif reason == "whitelisted":
            data.update(
                {
                    "prompt": "Only whitelisted users have access to Go services. To whitelist another person, please provide their NetID. Your request will be manually processed based on the comment provided.",
                    "placeholder": "Please provide a brief explanation of why you need to whitelist this person.",
                }
            )
        else:  # reason == "other"
            data.update(
                {
                    "prompt": "Please provide a brief description of your issue or request. Your ticket will be manually processed.",
                    "placeholder": "Please provide a brief description of your issue or request.",
                }
            )
        return data
    
    def send_help_desk_email(self, mail: Mail, ticket_id: str, category: str, resolution: Optional[str] = None, comment: Optional[str] = None):
        """
        Send an email to the help desk with the ticket ID and action.
        
        :param ticket_id: the ID of the ticket
        :param category: the category of the ticket
        :param resolution: the resolution of the ticket (optional)
        :param comment: the admin comment for the ticket resolution (optional)
        """
        ticket = self.get_ticket(ticket_id=ticket_id)
        
        # Construct the email
        SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
        HTML_TEMPLATE_PATH = os.path.join(SCRIPT_DIR, "../templates/html/tickets", f"{category}.html")
        PLAINTEXT_TEMPLATE_PATH = os.path.join(SCRIPT_DIR, "../templates/txt/tickets", f"{category}.txt")
        
        from_email = "go-support@oit.rutgers.edu"
        recipient_list = [f"{ticket['reporter']}@rutgers.edu"]
        subject = "Go: Rutgers University URL Shortener - "
        variables = {
            "ticket_id": ticket_id,
            "reporter": ticket["reporter"],
            "resolution": resolution.upper() if resolution else None,
            "comment": comment,       
        }
        
        if category == "confirmation":
            subject += "Ticket Submitted"
        elif category == "notification":
            subject += "New Pending Ticket"
            recipient_list = ["oss@oit.rutgers.edu"]
        else: # category == "resolution"
            subject += "Ticket Resolved"
        
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
            recipient_list=recipient_list
        )
        

    def create_ticket(self, ticket_data: dict) -> str:
        """
        Create a new ticket

        :param ticket_data: the data for the new ticket

        :return: the ID of the new ticket
        """
        timestamp = str(time.time())
        result = self.db.tickets.insert_one(
            {
                "timestamp": timestamp,
                **ticket_data,
            }
        )
        return str(result.inserted_id)

    def delete_ticket(self, ticket_id: str):
        """
        Delete a ticket

        :param ticket_id: the ID of the ticket to delete
        """
        self.db.tickets.delete_one({"_id": ObjectId(ticket_id)})

    def get_ticket(
        self,
        *,
        ticket_id: Optional[str] = None,
        reporter: Optional[str] = None,
        reason: Optional[str] = None,
        entity: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get a single ticket that matches the given criteria. Note that this will return either 0 or 1 tickets.

        :param ticket_id: the ID of the ticket (optional)
        :param reporter: the reporter of the ticket (optional)
        :param reason: the reason for the ticket (optional)
        :param entity: the entity for the ticket (optional)

        :return: the ticket or None if no ticket matches the criteria
        """
        query = {}

        if ticket_id:
            query["_id"] = ObjectId(ticket_id)
        if reporter:
            query["reporter"] = reporter
        if reason:
            query["reason"] = reason
        if entity:
            query["entity"] = entity

        return self.db.tickets.find_one(query)

    def get_tickets(
        self, reporter: Optional[str] = None, timestamp_sort: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get all tickets by the given reporter or all tickets if no reporter is specified.

        :param reporter: the reporter of the tickets (optional)
        :param timestamp_sort: the sort order for the tickets (optional)

        :return: a list of tickets
        """
        query = {"reporter": reporter} if reporter else {}
        sort = []
        if timestamp_sort == "asc":
            sort = [("timestamp", pymongo.ASCENDING)]
        elif timestamp_sort == "desc":
            sort = [("timestamp", pymongo.DESCENDING)]
        return list(self.db.tickets.find(query, sort=sort))

    def count_tickets(self, reporter: Optional[str]) -> int:
        """
        Count the number of tickets by reporter or all tickets if no reporter is specified.

        :param reporter: the reporter of the tickets (optional)

        :return: the number of tickets by the reporter
        """
        query = {"reporter": reporter} if reporter else {}
        return self.db.tickets.count_documents(query)
