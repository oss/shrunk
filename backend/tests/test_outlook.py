"""Outlook requests must authenticate before any update or database work."""

import hashlib
import hmac
from pathlib import Path
from unittest.mock import Mock

import pytest
from flask import Flask, send_from_directory

import shrunk


@pytest.fixture(name="outlook_app")
def fixture_outlook_app(monkeypatch: pytest.MonkeyPatch) -> Flask:
    monkeypatch.setenv("SHRUNK_FLASK_TESTING", "1")
    monkeypatch.setenv("SHRUNK_SECRET_KEY", "isolated-test-session-key")
    monkeypatch.setenv("SHRUNK_DEV_LOGINS", "0")
    monkeypatch.setenv("GITHUB_OUTLOOK_WEBHOOK_UPDATE_SECRET", "isolated-webhook-secret")
    monkeypatch.setattr(shrunk, "_init_shrunk_client", Mock(side_effect=AssertionError("Unexpected database access")))
    monkeypatch.setattr(shrunk, "_init_roles", Mock(side_effect=AssertionError("Unexpected role initialization")))
    monkeypatch.setattr(
        shrunk, "pull_outlook_assets_from_github", Mock(side_effect=AssertionError("Unexpected asset update"))
    )
    app = shrunk.create_app()
    app.testing = True
    return app


def signed_headers(body: bytes) -> dict[str, str]:
    digest = hmac.new(b"isolated-webhook-secret", body, hashlib.sha256).hexdigest()
    return {"X-Hub-Signature-256": f"sha256={digest}", "X-GitHub-Event": "create"}


def test_invalid_webhook_has_no_side_effects(outlook_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    update = Mock()
    monkeypatch.setattr(shrunk, "pull_outlook_assets_from_github", update)
    response = outlook_app.test_client().post("/outlook/update", data=b'{"ref_type":"tag"}')
    assert response.status_code == 401
    update.assert_not_called()


@pytest.mark.parametrize("signature", [None, "", "sha256=" + "0" * 64, "sha1=bad", "sha256=é"])
def test_invalid_signatures(outlook_app: Flask, monkeypatch: pytest.MonkeyPatch, signature: str | None) -> None:
    update = Mock()
    monkeypatch.setattr(shrunk, "pull_outlook_assets_from_github", update)
    headers = {"X-GitHub-Event": "create"}
    if signature is not None:
        headers["X-Hub-Signature-256"] = signature
    response = outlook_app.test_client().post("/outlook/update", data=b'{"ref_type":"tag"}', headers=headers)
    assert response.status_code == 401
    update.assert_not_called()


@pytest.mark.parametrize("secret", [None, ""])
def test_missing_secret(outlook_app: Flask, monkeypatch: pytest.MonkeyPatch, secret: str | None) -> None:
    if secret is None:
        monkeypatch.delenv("GITHUB_OUTLOOK_WEBHOOK_UPDATE_SECRET")
    else:
        monkeypatch.setenv("GITHUB_OUTLOOK_WEBHOOK_UPDATE_SECRET", secret)
    body = b'{"ref_type":"tag"}'
    # Even a correct signature under an empty key must fail closed.
    headers = signed_headers(body)
    headers["X-Hub-Signature-256"] = "sha256=" + hmac.new(b"", body, hashlib.sha256).hexdigest()
    update = Mock()
    monkeypatch.setattr(shrunk, "pull_outlook_assets_from_github", update)
    response = outlook_app.test_client().post("/outlook/update", data=body, headers=headers)
    assert response.status_code == 401
    update.assert_not_called()


@pytest.mark.parametrize(
    ("event", "body", "updates", "status"),
    [
        ("create", b'{"ref_type":"tag"}', 1, 200),
        ("create", b'{"ref_type":"branch"}', 0, 200),
        ("push", b'{"ref_type":"tag"}', 0, 200),
        (None, b'{"ref_type":"tag"}', 0, 200),
        ("create", b"{}", 0, 200),
        ("create", b"[]", 0, 400),
        ("create", b"null", 0, 400),
        ("create", b"{", 0, 400),
        ("create", b"\xff", 0, 400),
    ],
)
def test_authenticated_dispatch(
    outlook_app: Flask,
    monkeypatch: pytest.MonkeyPatch,
    event: str | None,
    body: bytes,
    updates: int,
    status: int,
) -> None:
    update = Mock()
    monkeypatch.setattr(shrunk, "pull_outlook_assets_from_github", update)
    headers = signed_headers(body)
    if event is None:
        del headers["X-GitHub-Event"]
    else:
        headers["X-GitHub-Event"] = event
    response = outlook_app.test_client().post("/outlook/update", data=body, headers=headers)
    assert response.status_code == status
    assert update.call_count == updates


def test_authentication_precedes_json_parsing(outlook_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    parse = Mock(side_effect=AssertionError("Unauthenticated JSON parsing"))
    monkeypatch.setattr(shrunk.json, "loads", parse)
    response = outlook_app.test_client().post("/outlook/update", data=b"{")
    assert response.status_code == 401
    parse.assert_not_called()


def test_modified_body_rejected(outlook_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    update = Mock()
    monkeypatch.setattr(shrunk, "pull_outlook_assets_from_github", update)
    body = b'{"ref_type":"tag"}'
    response = outlook_app.test_client().post("/outlook/update", data=body + b" ", headers=signed_headers(body))
    assert response.status_code == 401
    update.assert_not_called()


def test_update_failure_is_reported(outlook_app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    update = Mock(side_effect=RuntimeError("Download failed"))
    monkeypatch.setattr(shrunk, "pull_outlook_assets_from_github", update)
    body = b'{"ref_type":"tag"}'
    response = outlook_app.test_client().post("/outlook/update", data=body, headers=signed_headers(body))
    assert response.status_code == 500
    update.assert_called_once_with()


@pytest.mark.parametrize("env", ["dev", "prod"])
@pytest.mark.parametrize("filename", ["manifest.xml", "nested/icon.png"])
def test_asset_allowlist_and_path_safety(
    outlook_app: Flask,
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    env: str,
    filename: str,
) -> None:
    # Asset requests use normal request auditing, backed by an in-memory stub.
    setattr(outlook_app, "client", Mock(record_visit=Mock()))
    monkeypatch.setattr(shrunk, "_init_shrunk_client", lambda: None)
    monkeypatch.setattr(shrunk, "_init_roles", lambda: None)
    for environment in ("dev", "prod"):
        asset = tmp_path / environment / filename
        asset.parent.mkdir(parents=True, exist_ok=True)
        asset.write_text(f"asset-{environment}")
    (tmp_path / "private.txt").write_text("private-canary")

    def serve(directory: str, requested: str) -> object:
        assert directory == f"/var/www/outlook/{env}"
        return send_from_directory(tmp_path / env, requested)

    monkeypatch.setattr(shrunk, "send_from_directory", serve)
    client = outlook_app.test_client()
    response = client.get(f"/outlook/assets/{env}/{filename}")
    assert response.status_code == 200
    assert response.data == f"asset-{env}".encode()
    for path in (
        f"{env}/../private.txt",
        f"{env}/%2e%2e/private.txt",
        f"{env}/%2e%2e%2fprivate.txt",
        f"{env}/nested/../../private.txt",
        f"{env}/%2fetc/passwd",
        "invalid/private.txt",
        "DEV/private.txt",
        "%2e%2e/private.txt",
        "%2e%2e%2fdev/private.txt",
    ):
        response = client.get(f"/outlook/assets/{path}")
        assert response.status_code in {400, 404}
        assert b"private-canary" not in response.data
