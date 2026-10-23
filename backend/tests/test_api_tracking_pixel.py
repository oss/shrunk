from datetime import datetime, timedelta, timezone

import pytest
from bson import ObjectId
from werkzeug.test import Client
from util import dev_login, create_tracking_pixel, assert_is_response_valid


@pytest.mark.parametrize("extension", [".png", ".gif"])
def test_create_pixel_with_ui_payload(client, extension):
    with dev_login(client, "user"):
        response = client.post(
            "/api/core/link",
            json={
                "is_tracking_pixel_link": True,
                "tracking_pixel_extension": extension,
            },
        )
        assert_is_response_valid(response)
        info = client.get(f"/api/core/link/{response.json['id']}").json
        assert info["alias"].endswith(extension)
        assert info["title"]


@pytest.mark.parametrize(
    ("state", "status"),
    [("ordinary", 404), ("expired", 404), ("deleted", 404), ("invalid-extension", 400), ("active", 200)],
)
def test_pixel_state_before_visit(client, app, tracking_pixel_data, state, status):  # pylint: disable=redefined-outer-name
    link_id = tracking_pixel_data["link_id"]
    alias = tracking_pixel_data["alias"]
    fields = {}
    if state == "ordinary":
        fields["is_tracking_pixel_link"] = False
    elif state == "expired":
        fields["expiration_time"] = datetime.now(timezone.utc) - timedelta(days=1)
    elif state == "deleted":
        fields["deleted"] = True
    elif state == "invalid-extension":
        alias = "invalid-pixel.jpg"
        fields["alias"] = alias
    if fields:
        app.client.db.urls.update_one({"_id": ObjectId(link_id)}, {"$set": fields})
    with dev_login(client, "user"):
        response = client.get(f"/api/core/t/{alias}")
        assert response.status_code == status
        # Restore visibility so stats can be queried for a deleted pixel too.
        app.client.db.urls.update_one({"_id": ObjectId(link_id)}, {"$set": {"deleted": False}})
        stats = client.get(f"/api/core/link/{link_id}/stats").json
        assert stats["total_visits"] == (1 if state == "active" else 0)


@pytest.fixture
def tracking_pixel_data(client: Client):
    """Fixture that creates tracking pixel and returns its data"""
    with dev_login(client, "user"):
        resp = create_tracking_pixel(client, "Tracking Pixel", ".png")
        assert resp.json is not None
        assert_is_response_valid(resp)
        link_id = resp.json["id"]

        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.json is not None
        assert resp.status_code == 200

        return {
            "link_id": link_id,
            "alias": resp.json["alias"],
            "title": resp.json["title"],
        }


def test_create_tracking_pixel_png(tracking_pixel_data):  # pylint: disable=redefined-outer-name
    """Test that verifies the creation worked"""
    assert tracking_pixel_data["title"] == "Tracking Pixel"
    assert tracking_pixel_data["alias"].endswith(".png")


def test_create_tracking_pixel_gif(client: Client):
    """Test that verifies the creation worked"""
    with dev_login(client, "user"):
        resp = create_tracking_pixel(client, "Tracking Pixel", ".gif")
        assert resp.json is not None
        assert_is_response_valid(resp)
        link_id = resp.json["id"]

        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.json is not None
        assert resp.status_code == 200
        assert resp.json["alias"].endswith(".gif")


def test_get_tracking_pixel(client: Client, tracking_pixel_data):  # pylint: disable=redefined-outer-name
    """Test that uses the created tracking pixel"""
    with dev_login(client, "user"):
        resp = client.get(f"/api/core/t/{tracking_pixel_data['alias']}")
        assert resp.status_code == 200
        assert resp.headers["X-Image-Name"] == "pixel.png"

        resp = client.get(f"/{tracking_pixel_data['alias']}")
        assert resp.status_code == 404
