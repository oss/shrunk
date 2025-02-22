import contextlib
from typing import Any, Generator

from flask import Response
from werkzeug.test import Client


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


@contextlib.contextmanager
def dev_login(client: Client, login: str) -> Generator[None, None, None]:
    assert_status(client.post(f"/api/v1/devlogins/{login}"), 200)
    try:
        yield
    finally:
        assert_status(client.post("/api/v1/logout"), 200)
