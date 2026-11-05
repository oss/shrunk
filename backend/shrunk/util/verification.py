import hashlib
import hmac
from flask import current_app


def verify_signature(payload_body: bytes, secret_token: str | None, signature_header: str | None) -> None:
    """Verify that the payload was sent from GitHub by validating SHA256.

    Raise ValueError if the secret or signature is missing or invalid.

    Args:
        payload_body: original request body to verify (request.body())
        secret_token: GitHub app webhook token (WEBHOOK_SECRET)
        signature_header: header received from GitHub (x-hub-signature-256)
    """
    if not isinstance(secret_token, str) or not secret_token:
        raise ValueError("missing webhook secret")
    if not isinstance(signature_header, str) or not signature_header or not signature_header.isascii():
        current_app.logger.error("x-hub-signature-256 header is missing!")
        raise ValueError("missing signature header")
    hash_object = hmac.new(secret_token.encode("utf-8"), msg=payload_body, digestmod=hashlib.sha256)
    expected_signature = "sha256=" + hash_object.hexdigest()

    if not hmac.compare_digest(expected_signature, signature_header):
        current_app.logger.error("Request signatures didn't match!")
        raise ValueError("signature mismatch")
