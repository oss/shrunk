"""Opt-in-by-credential check of the real Google integration (including CI)."""

import os

import pytest
from flask import Flask

from shrunk.client import ShrunkClient
from shrunk.client.security import SecurityClient


@pytest.mark.skipif(
    not os.getenv("SHRUNK_GOOGLE_SAFEBROWSE_API_KEY"), reason="Google Safe Browsing API key not configured"
)
@pytest.mark.parametrize(
    ("url", "detected"),
    [("http://malware.testing.google.test/testing/malware/*", True), ("https://google.com/", False)],
)
def test_google_safe_browsing_live(
    app: Flask, db: ShrunkClient, monkeypatch: pytest.MonkeyPatch, url: str, detected: bool
) -> None:
    monkeypatch.setenv("SHRUNK_GOOGLE_SAFEBROWSE_ENABLED", "1")
    security = SecurityClient(db=db.db, other_clients=db)
    with app.app_context():
        assert security.security_risk_detected(url) is detected
    assert security.get_security_status() == "ON"
