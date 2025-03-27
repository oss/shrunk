from werkzeug.test import Client
from util import dev_login, create_link, create_tracking_pixel


def test_search_types(client: Client) -> None:
    with dev_login(client, "admin"):
        create_link(client, "link", "http://example.com", alias="alias0")
        create_tracking_pixel(client, "tracking_pixel", ".png")

    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/search",
            json={
                "pagination": {"skip": 0, "limit": 10},
                "query": "",
                "set": {"set": "user"},
                "sort": {"key": "relevance", "order": "descending"},
                "show_deleted_links": False,
                "show_expired_links": False,
                "show_type": "links",
            },
        )
        assert resp.status_code == 200
        assert len(resp.json["results"]) == 1
        assert resp.json["results"][0]["description"] == "link"

        resp = client.post(
            "/api/core/search",
            json={
                "pagination": {"skip": 0, "limit": 10},
                "query": "",
                "set": {"set": "user"},
                "sort": {"key": "relevance", "order": "descending"},
                "show_deleted_links": False,
                "show_expired_links": False,
                "show_type": "tracking_pixels",
            },
        )
        assert resp.status_code == 200
        assert len(resp.json["results"]) == 1
        assert resp.json["results"][0]["description"] == "tracking_pixel"
