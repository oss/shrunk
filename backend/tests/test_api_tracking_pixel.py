from ast import Str
import time
import base64
from datetime import datetime, timezone, timedelta
import random

import pytest
from werkzeug.test import Client

from util import dev_login


def test_create_tracking_pixel(client: Client) -> None:
    """
    Creates a tracking pixel link using link creation system
    """

    with dev_login(client, "user"):
        resp = client.post(
            "/api/v1/link",
            json={
                "title": "Tracking Pixel",
                "long_url": "https://example.com",
                "is_tracking_pixel_link": True,
            },
        )

        assert 200 <= resp.status_code < 300
        link_id = resp.json["id"]

        # Add an alias
        resp = client.post(
            f"/api/v1/link/{link_id}/alias",
            json={
                "description": "alias0",
            },
        )
        assert 200 <= resp.status_code < 300
        alias0 = resp.json["alias"]

        resp = client.get(f"/api/v1/link/{link_id}")
        assert 200 <= resp.status_code < 300
        assert resp.json["title"] == "Tracking Pixel"

        resp = client.get(f"/{alias0}")
        assert resp.status_code == 200
        assert resp.headers["X-Image-Name"] == "pixel.gif"
