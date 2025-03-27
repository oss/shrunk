import base64

import pytest
from util import dev_login
from werkzeug.test import Client

general_tickets = [
    {
        "reason": "power_user",
        "user_comment": "Give me power user access",
    },
    {
        "reason": "whitelisted",
        "entity": "test123",
        "user_comment": "Whitelist this person",
    },
    {
        "reason": "other",
        "user_comment": "I have an issue",
    },
]


@pytest.mark.parametrize(
    ("ticket"),
    general_tickets,
)
def test_create_ticket(client: Client, ticket: dict):
    """Test creating a ticket

    Args:
        client (Client): The test client
        ticket (dict): The ticket to create
    """
    ticket_id = ""
    with dev_login(client, "user"):
        # Create the ticket
        resp = client.post("/api/core/ticket", json=ticket)
        assert resp.status_code == 201, "Failed to create ticket"
        ticket_id = resp.json["ticket"]["_id"]

    with dev_login(client, "admin"):
        # Delete the ticket
        resp = client.delete(
            f"/api/core/ticket/"
            f"{str(base64.b32encode(bytes(ticket_id, 'utf8')), 'utf8')}"
        )
        assert resp.status_code == 204, "Failed to delete ticket"


def test_create_ticket_duplicate(client: Client):
    """Test creating a duplicate ticket

    Args:
        client (Client): The test client
    """
    ticket = {
        "reason": "power_user",
        "user_comment": "Give me power user access",
    }
    ticket_id = ""
    with dev_login(client, "user"):
        # Create the ticket
        resp = client.post("/api/core/ticket", json=ticket)
        assert resp.status_code == 201, "Failed to create ticket"
        ticket_id = resp.json["ticket"]["_id"]

        # Attempt to create the ticket again
        resp = client.post("/api/core/ticket", json=ticket)
        assert resp.status_code == 409, "Created duplicate ticket"

    with dev_login(client, "admin"):
        # Delete the ticket
        resp = client.delete(
            f"/api/core/ticket/"
            f"{str(base64.b32encode(bytes(ticket_id, 'utf8')), 'utf8')}"
        )
        assert resp.status_code == 204, "Failed to delete ticket"


def test_create_ticket_has_role(client: Client):
    """Test creating a ticket where the entity already has the role

    Args:
        client (Client): The test client
        ticket (dict): The ticket to create
    """
    ticket = {
        "reason": "power_user",
        "user_comment": "Give me power user access",
    }
    with dev_login(client, "power"):
        # Attempt to create the ticket
        resp = client.post("/api/core/ticket", json=ticket)
        assert resp.status_code == 409, "Created ticket for user with role"


def test_get_tickets(client: Client):
    """Test getting tickets

    Args:
        client (Client): The test client
    """
    ticket_ids = []
    with dev_login(client, "user"):
        # Create the tickets
        for ticket in general_tickets:
            resp = client.post("/api/core/ticket", json=ticket)
            assert resp.status_code == 201, "Failed to create ticket"
            ticket_ids.append(resp.json["ticket"]["_id"])

        # Get the tickets
        resp = client.get("/api/core/ticket?filter=reporter:DEV_USER")
        assert resp.status_code == 200, "Failed to get tickets"

        # Get the tickets with reason power_user
        resp = client.get("/api/core/ticket?filter=reporter:DEV_USER,reason:power_user")
        assert resp.status_code == 200, "Failed to get tickets"

        # Get the tickets sorted by created_time
        resp = client.get(
            "/api/core/ticket?filter=reporter:DEV_USER&sort=-created_time"
        )
        assert resp.status_code == 200, "Failed to get tickets"

        # Get the number of tickets
        resp = client.get("/api/core/ticket?filter=reporter:DEV_USER&count=true")
        assert resp.json["count"] == 3, "Failed to get tickets count"

    with dev_login(client, "admin"):
        # Delete the tickets
        for ticket_id in ticket_ids:
            resp = client.delete(
                f"/api/core/ticket/"
                f"{str(base64.b32encode(bytes(ticket_id, 'utf8')), 'utf8')}"
            )
            assert resp.status_code == 204, "Failed to delete ticket"


@pytest.mark.parametrize(
    ("ticket"),
    general_tickets,
)
def test_close_ticket(client: Client, ticket: dict):
    """Test closing a ticket

    Args:
        client (Client): The test client
        ticket (dict): The ticket to create
    """
    ticket_id = ""
    with dev_login(client, "user"):
        # Create the ticket
        resp = client.post("/api/core/ticket", json=ticket)
        assert resp.status_code == 201, "Failed to create ticket"
        ticket_id = resp.json["ticket"]["_id"]

        # Close the ticket
        resp = client.patch(
            f"/api/core/ticket/"
            f"{str(base64.b32encode(bytes(ticket_id, 'utf8')), 'utf8')}",
            json={"action": "close", "actioned_by": "DEV_USER"},
        )
        assert resp.status_code == 200, "Failed to close ticket"

    with dev_login(client, "admin"):
        # Delete the ticket
        resp = client.delete(
            f"/api/core/ticket/"
            f"{str(base64.b32encode(bytes(ticket_id, 'utf8')), 'utf8')}"
        )
        assert resp.status_code == 204, "Failed to delete ticket"


@pytest.mark.parametrize(
    ("ticket"),
    general_tickets,
)
def test_resolve_ticket(client: Client, ticket: dict):
    """Test resolving a ticket

    Args:
        client (Client): The test client
        ticket (dict): The ticket to create
    """
    ticket_id = ""
    with dev_login(client, "user"):
        # Create the ticket
        resp = client.post("/api/core/ticket", json=ticket)
        assert resp.status_code == 201, "Failed to create ticket"
        ticket_id = resp.json["ticket"]["_id"]

    with dev_login(client, "admin"):
        # Resolve the ticket
        if ticket["reason"] == "power_user" or ticket["reason"] == "whitelisted":
            data = {
                "action": "resolve",
                "admin_review": "I do not want to give this person the role",
                "is_role_granted": False,
            }
        else:
            data = {"action": "resolve", "admin_review": "I have resolved the issue"}
        resp = client.patch(
            f"/api/core/ticket/"
            f"{str(base64.b32encode(bytes(ticket_id, 'utf8')), 'utf8')}",
            json=data,
        )
        assert resp.status_code == 200, "Failed to resolve ticket"

        # Delete the ticket
        resp = client.delete(
            f"/api/core/ticket/"
            f"{str(base64.b32encode(bytes(ticket_id, 'utf8')), 'utf8')}"
        )
        assert resp.status_code == 204, "Failed to delete ticket"
