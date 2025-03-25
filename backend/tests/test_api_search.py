from werkzeug.test import Client
from util import dev_login, create_link, create_tracking_pixel


def test_search_types(client: Client) -> None:
    with dev_login(client, "user"):
        create_link(client, "link", "http://example.com", "alias0")
        create_tracking_pixel(client, "tracking_pixel")

        resp = client.post(
            "/api/v1/search",
            json={
                "query": "",
                "set": {"set": "user"},
                "sort": {"key": "title", "order": "ascending"},
                "show_deleted_links": False,
                "show_expired_links": False,
                "show_type": "links",
            },
        )
        assert resp.status_code == 200
        assert len(resp.json["results"]) == 1
        assert resp.json["results"][0]["title"] == "link"

        resp = client.post(
            "/api/v1/search",
            json={
                "query": "",
                "set": {"set": "user"},
                "sort": {"key": "title", "order": "ascending"},
                "show_deleted_links": False,
                "show_expired_links": False,
                "show_type": "tracking_pixels",
            },
        )
        assert resp.status_code == 200
        assert len(resp.json["results"]) == 1
        assert resp.json["results"][0]["title"] == "tracking_pixel"
