"""Regression tests for the browser-facing core API error contract."""

from typing import Any

from flask import Flask
from werkzeug.test import Client, TestResponse

from util import dev_login


def assert_core_api_error(
    response: TestResponse,
    *,
    status_code: int,
    error_code: str,
    message: str | None = None,
) -> dict[str, Any]:
    """Assert that a response uses the public core API error envelope."""
    assert response.status_code == status_code
    assert response.mimetype == "application/json"
    assert response.json is not None
    assert response.json["error"]["code"] == error_code
    if message is not None:
        assert response.json["error"]["message"] == message
    return response.json["error"]


def test_unknown_core_api_route_has_json_error(client: Client) -> None:
    response = client.get("/api/core/not-a-route")

    assert_core_api_error(response, status_code=404, error_code="NOT_FOUND")


def test_method_not_allowed_preserves_allow_header(client: Client) -> None:
    response = client.get("/api/core/logout")

    assert_core_api_error(response, status_code=405, error_code="METHOD_NOT_ALLOWED")
    assert "POST" in response.headers["Allow"]


def test_request_schema_error_includes_a_safe_message(client: Client) -> None:
    response = client.post("/api/core/org", json={})

    error = assert_core_api_error(
        response,
        status_code=400,
        error_code="INVALID_REQUEST",
        message="Some submitted information is invalid.",
    )
    assert "fields" in error
    assert "required property" in error["fields"]["_form"]


def test_duplicate_organization_identifies_the_name_field(client: Client) -> None:
    with dev_login(client, "admin"):
        assert client.post("/api/core/org", json={"name": "Team Shrunk"}).status_code == 200
        response = client.post("/api/core/org", json={"name": "Team Shrunk"})

    error = assert_core_api_error(
        response,
        status_code=409,
        error_code="ORGANIZATION_NAME_TAKEN",
        message="An organization with this name already exists. Choose a different name.",
    )
    assert error["fields"] == {"name": "Choose a different organization name."}


def test_invalid_stats_date_range_is_a_non_success_json_error(client: Client) -> None:
    with dev_login(client, "admin"):
        created = client.post(
            "/api/core/link",
            json={"long_url": "https://example.com"},
        )
        assert created.json is not None

        response = client.get(
            f"/api/core/link/{created.json['id']}/stats/visits"
            "?start_date=2026-01-02T00:00:00&end_date=2026-01-01T00:00:00"
        )

    error = assert_core_api_error(
        response,
        status_code=400,
        error_code="INVALID_DATE_RANGE",
    )
    assert error["fields"] == {"start_date": "Choose a date before the end date."}


def test_pending_link_errors_use_the_core_contract(client: Client) -> None:
    with dev_login(client, "admin"):
        for url, method in (
            ("/api/core/security/status/000000000000000000000000", client.get),
            ("/api/core/security/promote/000000000000000000000000", client.patch),
            ("/api/core/security/reject/000000000000000000000000", client.patch),
        ):
            response = method(url)
            assert_core_api_error(
                response,
                status_code=404,
                error_code="PENDING_LINK_NOT_FOUND",
            )


def test_unexpected_core_api_error_is_safe(client: Client, app: Flask, monkeypatch: Any) -> None:
    def fail() -> None:
        raise RuntimeError("database credentials must never reach the browser")

    monkeypatch.setitem(app.config, "PROPAGATE_EXCEPTIONS", True)
    monkeypatch.setitem(app.view_functions, "get_features_flag", fail)

    response = client.get("/api/core/enabled")

    error = assert_core_api_error(
        response,
        status_code=500,
        error_code="INTERNAL_SERVER_ERROR",
    )
    assert "credentials" not in error["message"]


def test_non_core_routes_keep_their_existing_error_behavior(client: Client) -> None:
    response = client.get("/api/v1/not-a-route")

    assert response.status_code == 404
    assert response.mimetype == "text/html"


def test_public_api_schema_errors_keep_their_existing_error_behavior(
    client: Client,
) -> None:
    response = client.post("/api/v1/links", json={"unexpected": True})

    assert response.status_code == 400
    assert response.mimetype == "text/html"
