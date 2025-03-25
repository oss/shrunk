import pytest
from werkzeug.test import Client
from util import dev_login, create_tracking_pixel


def test_tracking_pixel(client: Client) -> None:
    """
    Creates a tracking pixel link using link creation system
    """

    with dev_login(client, "user"):
        resp = create_tracking_pixel(client, "Tracking Pixel")

        assert 200 <= resp.status_code < 300
        link_id = resp.json["id"]

        resp = client.get(f"/api/v1/link/{link_id}")
        alias0 = resp.json["aliases"][0]["alias"]

        assert 200 <= resp.status_code < 300
        assert resp.json["title"] == "Tracking Pixel"

        resp = client.get(f"/api/v1/t/{alias0}")
        assert resp.status_code == 200
        assert resp.headers["X-Image-Name"] == "pixel.gif"

        resp = client.get(f"/{alias0}")
        assert resp.status_code == 404
