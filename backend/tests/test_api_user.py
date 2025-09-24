import pytest
from werkzeug.test import Client
from util import dev_login


@pytest.mark.parametrize(
    ("user"),
    [
        ("admin"),
        ("facstaff"),
        ("whitelisted"),
        ("user"),
    ],
)
def test_default_options(client: Client, user: str) -> None:
    defaultOptions = {
        "show_expired_links": False,
        "show_deleted_links": False,
        "sort": {"key": "relevance", "order": "descending"},
        "showType": "links",
        "set": {"set": "user"},
        "begin_time": None,
        "end_time": None,
        "owner": None,
        "queryString": "",
    }
    with dev_login(client, user):
        resp = client.get("/api/core/user/info")
        assert resp.status_code == 200
        assert resp.json["filterOptions"] == defaultOptions


@pytest.mark.parametrize(
    ("user", "updated_options", "expected"),
    [
        (
            "admin",
            {
                "show_expired_links": False,
                "show_deleted_links": False,
                "sort": {"key": "relevance", "order": "descending"},
                "showType": "links",
                "set": {"set": "user"},
                "begin_time": None,
                "end_time": None,
                "owner": None,
                "queryString": None,
            },
            204,
        ),
        (
            "facstaff",
            {
                "show_expired_links": False,
                "show_deleted_links": False,
                "sort": {"key": "relevance", "order": "descending"},
                "showType": "links",
                "set": {"set": "user"},
                "begin_time": None,
                "end_time": None,
                "owner": None,
                "queryString": None,
            },
            204,
        ),
        (
            "user",
            {
                "show_expired_links": False,
                "show_deleted_links": True,
                "sort": {"key": "relevance", "order": "descending"},
                "showType": "links",
                "set": {"set": "user"},
                "begin_time": None,
                "end_time": None,
                "owner": None,
                "queryString": None,
            },
            204,
        ),
        (
            "user",
            {
                "show_expired_links": False,
                "show_deleted_links": False,
                "sort": {"key": "relevance", "order": "descending"},
                "showType": "links",
                "set": {"set": "user"},
                "end_time": None,
                "owner": None,
                "queryString": None,
            },
            400,
        ),
        (
            "admin",
            {},  # Missing required keys
            400,
        ),
    ],
)
def test_update_user_options(
    client: Client, user: str, updated_options: dict, expected: int
) -> None:
    with dev_login(client, user):
        resp = client.patch(
            "/api/core/user/options/filter", json={"filterOptions": updated_options}
        )
        assert resp.status_code == expected
