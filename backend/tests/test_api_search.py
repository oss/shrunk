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
                "set": [{"set": "user"}],
                "sort": {"key": "relevance", "order": "descending"},
                "show_deleted_links": False,
                "show_expired_links": False,
                "show_type": "links",
            },
        )
        assert resp.json is not None
        assert resp.status_code == 200
        assert len(resp.json["results"]) == 1
        assert resp.json["results"][0]["title"] == "link"
        assert resp.json["results"][0]["may_delete"] is True
        assert resp.json["results"][0]["may_transfer"] is True

        resp = client.post(
            "/api/core/search",
            json={
                "pagination": {"skip": 0, "limit": 10},
                "query": "",
                "set": [{"set": "user"}],
                "sort": {"key": "relevance", "order": "descending"},
                "show_deleted_links": False,
                "show_expired_links": False,
                "show_type": "tracking_pixels",
            },
        )
        assert resp.json is not None
        assert resp.status_code == 200
        assert len(resp.json["results"]) == 1
        assert resp.json["results"][0]["title"] == "tracking_pixel"


def test_search_deduplicates_before_pagination(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "Search Dedup Org"})
        assert resp.json is not None
        org_id = resp.json["id"]

        resp = client.put(f"/api/core/org/{org_id}/member/DEV_FACSTAFF")
        assert resp.status_code == 204

        for index in range(2):
            resp = client.post(
                "/api/core/link",
                json={
                    "title": f"deduplicated-link-{index}",
                    "long_url": "https://example.com",
                    "viewers": [{"_id": org_id, "type": "org"}],
                },
            )
            assert 200 <= resp.status_code < 300

    query = {
        "pagination": {"skip": 0, "limit": 1},
        "query": "",
        "set": [{"set": "org", "org": org_id}, {"set": "shared"}],
        "sort": {"key": "created_time", "order": "ascending"},
        "show_deleted_links": False,
        "show_expired_links": False,
        "show_type": "links",
    }

    with dev_login(client, "facstaff"):
        first_page = client.post("/api/core/search", json=query)
        assert first_page.status_code == 200
        assert first_page.json is not None
        assert first_page.json["count"] == 2
        assert len(first_page.json["results"]) == 1

        query["pagination"]["skip"] = 1
        second_page = client.post("/api/core/search", json=query)
        assert second_page.status_code == 200
        assert second_page.json is not None
        assert second_page.json["count"] == 2
        assert len(second_page.json["results"]) == 1
        assert first_page.json["results"][0]["_id"] != second_page.json["results"][0]["_id"]
