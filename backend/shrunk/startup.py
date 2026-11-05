"""Validate startup settings before serving requests or modifying the database."""

import os


def validate_startup() -> None:
    environment = os.getenv("FLASK_ENV", "production")
    if environment not in {"production", "development"}:
        raise ValueError("FLASK_ENV must be production or development")
    for flag in ("SHRUNK_FLASK_TESTING", "SHRUNK_DEV_LOGINS"):
        if os.getenv(flag, "0") not in {"0", "1"}:
            raise ValueError(f"{flag} must be 0 or 1")

    # Both escape hatches require explicit configuration. Neither debug nor a
    # development login flag alone can turn off production validation.
    if environment == "development" or os.getenv("SHRUNK_FLASK_TESTING", "0") == "1":
        return
    if os.getenv("SHRUNK_DEV_LOGINS", "0") != "0":
        raise ValueError("Production requires SHRUNK_DEV_LOGINS=0")
    # Match Flask's interpretation, including nonstandard truthy strings.
    if os.getenv("FLASK_DEBUG", "0").lower() not in {"0", "false", "no"}:
        raise ValueError("Production requires FLASK_DEBUG=0")
    secret = os.getenv("SHRUNK_SECRET_KEY", "")
    if len(secret.strip().encode()) < 32 or secret.strip().lower() in {"something_secret", "change_me", "changeme"}:
        raise ValueError("Production requires a generated SHRUNK_SECRET_KEY of at least 32 bytes")
