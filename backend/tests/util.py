import contextlib
from typing import Any, Generator, Optional

from flask import Response
from werkzeug.test import Client


def assert_is_response_valid(resp: Response) -> bool:
    assert 200 <= resp.status_code < 300


def create_link(
    client: Client, title: str, url: str, alias: Optional[str] = None
) -> str:
    body = {
        "title": title,
        "long_url": url,
    }

    if alias is not None:
        body["alias"] = alias

    return client.post(
        "/api/core/link",
        json=body,
    )


def create_tracking_pixel(
    client: Client, title: str, tracking_pixel_extension: str
) -> str:
    return client.post(
        "/api/core/link",
        json={
            "title": title,
            "long_url": "example.com",
            "is_tracking_pixel_link": True,
            "tracking_pixel_extension": tracking_pixel_extension,
        },
    )


def assert_redirect(resp: Response, location_pat: str) -> None:
    assert resp.status_code == 302
    assert location_pat in resp.headers["Location"]


def assert_status(resp: Response, status: int) -> None:
    assert resp.status_code == status


def assert_ok(resp: Response) -> None:
    assert_status(resp, 200)


def assert_not_500(resp: Response) -> None:
    assert resp.status_code < 500


def assert_in_resp(resp: Response, string: str) -> None:
    assert string in str(resp.get_data(), "utf8")


def assert_json(resp: Response, expected: Any) -> None:
    assert resp.get_json() == expected


def setup_guest_user(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "Test Org"})
        org_id = resp.json["id"]

        resp = client.put(f"/api/core/org/{org_id}/guest/DEV_GUEST")
        assert resp.status_code == 204

        return org_id


@contextlib.contextmanager
def dev_login(client: Client, login: str) -> Generator[None, None, None]:
    assert_status(client.post(f"/api/core/devlogins/{login}"), 200)
    try:
        yield
    finally:
        assert_status(client.post("/api/core/logout"), 200)
