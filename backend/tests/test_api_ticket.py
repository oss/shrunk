import base64

import pytest
from util import dev_login
from werkzeug.test import Client


@pytest.mark.parametrize(
    ("reporter", "reason", "entity", "comment"),
    [
        ("DEV_USER", "power_user", "DEV_USER", "I need power user access"),
        (
            "DEV_USER",
            "whitelisted",
            "ejw135",
            "I need to whitelist this person",
        ),
        ("DEV_USER", "other", None, "I have an issue"),
    ],
)
def test_create_delete_ticket(
    client: Client, reporter: str, reason: str, entity: str, comment: str
):
    """Test creating and deleting a ticket

    Args:
        client (Client): The test client
        reporter (str): The reporter of the ticket
        reason (str): The reason for the ticket
        entity (str): The entity for the ticket
        comment (str): The comment for the ticket
    """
    with dev_login(client, "user"):
        # Create a ticket
        resp = client.post(
            "/api/v1/ticket",
            json={
                "reporter": reporter,
                "reason": reason,
                "entity": entity,
                "comment": comment,
            },
        )
        assert resp.status_code == 201, "Failed to create ticket"

        # Delete the ticket
        ticket_id = resp.json["_id"]
        resp = client.delete(
            f"/api/v1/ticket/"
            f"{str(base64.b32encode(bytes(ticket_id, 'utf8')), 'utf8')}"
        )
        assert resp.status_code == 204, "Failed to delete ticket"


tickets = [
    {
        "reporter": "DEV_USER",
        "reason": "power_user",
        "entity": "DEV_USER",
        "comment": "I need power user access",
    },
    {
        "reporter": "DEV_USER",
        "reason": "whitelisted",
        "entity": "ejw135",
        "comment": "I need to whitelist this person",
    },
    {
        "reporter": "DEV_USER",
        "reason": "other",
        "entity": None,
        "comment": "I have an issue",
    },
]


@pytest.mark.parametrize(
    ("tickets"),
    [
        tickets[:1],
        tickets[:2],
        tickets,
    ],
)
def test_get_tickets(client: Client, tickets: list):
    """Test getting tickets

    Args:
        client (Client): The test client
        tickets (list): The tickets to check
    """
    with dev_login(client, "user"):
        # Create the tickets
        ticket_ids = []
        for ticket in tickets:
            resp = client.post("/api/v1/ticket", json=ticket)
            assert resp.status_code == 201, "Failed to create ticket"
            ticket_ids.append(resp.json["_id"])

        # Get the tickets
        resp = client.get("/api/v1/ticket")
        assert resp.status_code == 200, "Failed to get tickets"
        assert len(resp.json) == len(tickets), "Incorrect number of tickets"

        # Get individual tickets
        for ticket in resp.json:
            resp = client.get(
                f"/api/v1/ticket/"
                f"{str(base64.b32encode(bytes(ticket['_id'], 'utf8')), 'utf8')}"
            )
            assert resp.status_code == 200, "Failed to get ticket"

        # Delete the tickets
        for ticket_id in ticket_ids:
            resp = client.delete(
                f"/api/v1/ticket/"
                f"{str(base64.b32encode(bytes(ticket_id, 'utf8')), 'utf8')}"
            )
            assert resp.status_code == 204, "Failed to delete ticket"
