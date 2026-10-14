"""Webhook authentication must accept signed bytes and reject modified requests."""

import pytest
from flask import Flask

from shrunk.util.verification import verify_signature


BODY = b'{"event":"push"}'
SECRET = "test-webhook-secret"
SIGNATURE = "sha256=98a4f4d3ad51c916cc8da83717a84ca3193781b04c061215ca30bbedfd38cd56"


def test_valid_webhook_signature() -> None:
    with Flask(__name__).app_context():
        verify_signature(BODY, SECRET, SIGNATURE)


@pytest.mark.parametrize(
    ("body", "secret", "signature"),
    [
        (BODY + b" ", SECRET, SIGNATURE),
        (BODY, "different-secret", SIGNATURE),
        (BODY, SECRET, "sha256=" + "0" * 64),
        (BODY, SECRET, SIGNATURE.removeprefix("sha256=")),
        (BODY, SECRET, SIGNATURE.replace("sha256=", "sha1=")),
        (BODY, SECRET, ""),
        (BODY, SECRET, None),
    ],
)
def test_invalid_webhook_signature(body: bytes, secret: str, signature: str | None) -> None:
    with Flask(__name__).app_context(), pytest.raises(ValueError, match="signature"):
        verify_signature(body, secret, signature)
