import os
from types import SimpleNamespace

from flask import current_app
import pymongo.errors
import pytest
import shrunk
from werkzeug.test import Client


def test_motd(client: Client) -> None:
    resp = client.get("/api/core/motd")
    assert resp.status_code == 200
    assert resp.get_data(as_text=True) == os.getenv("SHRUNK_MOTD")


def test_record_visit_failure_does_not_fail_request(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_record_visit(*_args: object, **_kwargs: object) -> None:
        raise pymongo.errors.OperationFailure("TransactionTooOld")

    def init_client() -> None:
        current_app.client = SimpleNamespace(record_visit=fail_record_visit)

    monkeypatch.setenv("SHRUNK_FLASK_TESTING", "1")
    monkeypatch.setenv("SHRUNK_DEV_LOGINS", "0")
    monkeypatch.setattr(shrunk, "_init_logging", lambda: None)
    monkeypatch.setattr(shrunk, "_init_shrunk_client", init_client)
    monkeypatch.setattr(shrunk, "_init_roles", lambda: None)
    app = shrunk.create_app()

    resp = app.test_client().get("/api/core/enabled")

    assert resp.status_code == 200


def test_release_notes(client: Client) -> None:
    resp = client.get("/api/core/release-notes")
    assert resp.status_code == 200
