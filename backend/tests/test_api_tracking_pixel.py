import pytest
from werkzeug.test import Client
from util import dev_login, create_tracking_pixel, assert_is_response_valid


@pytest.fixture
def tracking_pixel_data(client: Client):
    """Fixture that creates tracking pixel and returns its data"""
    with dev_login(client, "user"):
        resp = create_tracking_pixel(client, "Tracking Pixel", ".png")
        assert_is_response_valid(resp)
        link_id = resp.json["id"]

        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.status_code == 200

        return {
            "link_id": link_id,
            "alias": resp.json["alias"],
            "description": resp.json["description"],
        }


def test_create_tracking_pixel_png(tracking_pixel_data):
    """Test that verifies the creation worked"""
    assert tracking_pixel_data["description"] == "Tracking Pixel"
    assert tracking_pixel_data["alias"].endswith(".png")


def test_create_tracking_pixel_gif(client: Client):
    """Test that verifies the creation worked"""
    with dev_login(client, "user"):
        resp = create_tracking_pixel(client, "Tracking Pixel", ".gif")
        assert_is_response_valid(resp)
        link_id = resp.json["id"]

        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.status_code == 200
        assert resp.json["alias"].endswith(".gif")


def test_get_tracking_pixel(client: Client, tracking_pixel_data):
    """Test that uses the created tracking pixel"""
    with dev_login(client, "user"):
        resp = client.get(f"/api/core/t/{tracking_pixel_data['alias']}")
        assert resp.status_code == 200
        assert resp.headers["X-Image-Name"] == "pixel.png"

        resp = client.get(f"/{tracking_pixel_data['alias']}")
        assert resp.status_code == 404
