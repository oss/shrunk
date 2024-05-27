import base64

import pytest
from flask.testing import FlaskClient as Client
from util import dev_login
from werkzeug.test import Client


@pytest.mark.parametrize(
    ("user", "entity"),
    [
        ("user", "DEV_USER"),
        ("facstaff", "DEV_FACSTAFF"),
    ],
)
def test_request_role(client: Client, user: str, entity: str) -> None:
    """
    Test the role request functionality.

    Args:
        client (Client): The test client.
        user (str): The user making the role request.
        entity (str): The entity associated with the role request.

    Raises:
        AssertionError: If the test fails.

    Returns:
        None
    """
    with dev_login(client, user):
        # Make a power user role request
        resp = client.post(
            "/api/v1/role_request",
            json={
                "role": "power_user",
                "comment": "I need to be able to do things",
            },
        )
        assert resp.status_code == 201, "Failed to create role request"

    with dev_login(client, "admin"):
        # Check that the power user role request does exist
        encoded_entity = str(base64.b32encode(bytes(entity, "utf8")), "utf8")
        resp = client.get(f"/api/v1/role_request/power_user/{encoded_entity}")
        assert resp.status_code == 200, "Failed to get role request"

        # Check that the power user role request count is 1
        resp = client.get("/api/v1/role_request/power_user/count")
        assert resp.status_code == 200, "Failed to get role request count"

        # Deny the role request
        resp = client.delete(
            "/api/v1/role_request/deny",
            json={
                "role": "power_user",
                "entity": entity,
            },
        )
        assert resp.status_code == 204, "Failed to deny role request"


@pytest.mark.parametrize(
    ("user", "entity"),
    [
        ("user", "DEV_USER"),
        ("facstaff", "DEV_FACSTAFF"),
    ],
)
def test_request_role_already_exists(client: Client, user: str, entity: str):
    """
    Test case to verify that making a duplicate role request returns a 409 status code.

    Args:
        client (Client): The test client for making HTTP requests.
        user (str): The user making the role request.
        entity (str): The entity associated with the role request.

    Raises:
        AssertionError: If the test fails.

    Returns:
        None
    """
    with dev_login(client, user):
        # Make a power user role request
        resp = client.post(
            "/api/v1/role_request",
            json={
                "role": "power_user",
                "comment": "I need to be able to do things",
            },
        )
        assert resp.status_code == 201, "Failed to create role request"

        # Make the same power user role request again
        resp = client.post(
            "/api/v1/role_request",
            json={
                "role": "power_user",
                "comment": "I need to be able to do things",
            },
        )
        assert resp.status_code == 409, "Made a duplicate role request"

    with dev_login(client, "admin"):
        # Deny the role request
        resp = client.delete(
            "/api/v1/role_request/deny",
            json={
                "role": "power_user",
                "entity": entity,
            },
        )
        assert resp.status_code == 204, "Failed to deny role request"


@pytest.mark.parametrize(
    ("entity"),
    [
        ("DEV_USER"),
        ("DEV_FACSTAFF"),
    ],
)
def test_deny_role_request_does_not_exist(client: Client, entity: str) -> None:
    """
    Test case to verify that denying a role request that does not exist returns a 404 status code.

    Args:
        client (Client): The test client for making HTTP requests.
        entity (str): The entity for which the role request is being deleted.

    Raises:
        AssertionError: If the test fails.

    Returns:
        None
    """
    with dev_login(client, "admin"):
        # Deny the role request
        resp = client.delete(
            "/api/v1/role_request/deny",
            json={
                "role": "power_user",
                "entity": entity,
            },
        )
        assert resp.status_code == 404, "Denied a role request that does not exist"


def test_get_pending_role_requests(client: Client) -> None:
    """
    Test getting all pending role requests and the count of pending role requests.

    Args:
        client (Client): The test client.
        user (str): The user making the role request.
        entity (str): The entity associated with the role request.

    Raises:
        AssertionError: If the test fails.

    Returns:
        None
    """
    with dev_login(client, "user"):
        # Make a power user role request
        resp = client.post(
            "/api/v1/role_request",
            json={
                "role": "power_user",
                "comment": "I need to be able to do things",
            },
        )
        assert resp.status_code == 201, "Failed to create role request"

    with dev_login(client, "facstaff"):
        # Make a power user role request
        resp = client.post(
            "/api/v1/role_request",
            json={
                "role": "power_user",
                "comment": "I need to be able to do things",
            },
        )
        assert resp.status_code == 201, "Failed to create role request"

    with dev_login(client, "admin"):
        # Get all pending role requests
        resp = client.get("/api/v1/role_request/power_user")
        assert resp.status_code == 200, "Failed to get pending role requests"

        resp = client.get("/api/v1/role_request/power_user/count")
        assert resp.status_code == 200, "Failed to get pending role request count"
        assert (
            resp.json["count"] == 2
        ), "Failed to get correct pending role request count"

        # Delete the role requests
        resp = client.delete(
            "/api/v1/role_request/deny",
            json={
                "role": "power_user",
                "entity": "DEV_USER",
            },
        )
        assert resp.status_code == 204, "Failed to deny user's role request"
        resp = client.delete(
            "/api/v1/role_request/deny",
            json={
                "role": "power_user",
                "entity": "DEV_FACSTAFF",
            },
        )
        assert resp.status_code == 204, "Failed to deny facstaff's role request"


def test_get_role_request_text(client: Client) -> None:
    """
    Test getting the request text for a role.

    Args:
        client (Client): The test client.

    Raises:
        AssertionError: If the test fails.

    Returns:
        None
    """
    with dev_login(client, "user"):
        # Get the request text for the power user role
        resp = client.get("/api/v1/role_request/power_user/request-text")
        assert "text" in resp.json, "Failed to get request text for role"
        assert resp.json["text"], "Failed to get request text for role"


@pytest.mark.parametrize(
    ("user"),
    [
        ("user"),
        ("facstaff"),
    ],
)
def test_get_pending_role_requests_unauthorized(client: Client, user: str) -> None:
    """
    Test that a regular user cannot get pending role requests or count of pending role requests.

    Args:
        client (Client): The test client.
        user (str): The user getting the pending role requests.

    Raises:
        AssertionError: If the test fails.

    Returns:
        None
    """
    with dev_login(client, user):
        # Get all pending role requests
        resp = client.get("/api/v1/role_request/power_user")
        assert resp.status_code == 403, "Regular user can get pending role requests"

        # Get the count of pending role requests
        resp = client.get("/api/v1/role_request/power_user/count")
        assert (
            resp.status_code == 403
        ), "Regular user can get pending role request count"


@pytest.mark.parametrize(
    ("entity"),
    [
        ("DEV_USER"),
        ("DEV_FACSTAFF"),
    ],
)
def test_get_role_request_does_not_exist(client: Client, entity: str) -> None:
    """
    Test that getting a role request that does not exist returns a 204 status code.

    Args:
        client (Client): The test client.
        entity (str): The entity for which the role request does not exist.

    Raises:
        AssertionError: If the test fails.

    Returns:
        None
    """
    with dev_login(client, "admin"):
        # Get the request text for the power user role
        encoded_entity = str(base64.b32encode(bytes(entity, "utf8")), "utf8")
        resp = client.get(f"/api/v1/role_request/power_user/{encoded_entity}")
        assert (
            resp.status_code == 204
        ), "Got request text for a role that does not exist"


@pytest.mark.parametrize(
    ("entity"),
    [
        ("DEV_USER"),
        ("DEV_FACSTAFF"),
    ],
)
def test_deny_role_request_does_not_exist(client: Client, entity: str) -> None:
    """
    Test the denial of a role request that does not exist returns a 404 status code.

    Args:
        client (Client): The test client.
        entity (str): The entity for which the role request does not exist.

    Raises:
        AssertionError: If the test fails.

    Returns:
        None
    """
    with dev_login(client, "admin"):
        # Delete the role request
        resp = client.delete(
            "/api/v1/role_request/deny",
            json={
                "role": "power_user",
                "entity": entity,
            },
        )
        assert resp.status_code == 404, "Deleted a role request that does not exist"


@pytest.mark.parametrize(
    ("user"),
    [
        ("user"),
        ("facstaff"),
    ],
)
def test_deny_role_request_unauthorized(client: Client, user: str):
    """
    Test that a regular user cannot deny a role request.

    Args:
        client (Client): The test client.
        user (str): The user deleting the role request.

    Raises:
        AssertionError: If the test fails.

    Returns:
        None
    """
    with dev_login(client, user):
        # Delete the role request
        resp = client.delete(
            "/api/v1/role_request/deny",
            json={
                "role": "power_user",
                "entity": "DEV_USER",
            },
        )
        assert resp.status_code == 403, "Regular user can deny role request"
