import random
import pytest
from werkzeug.test import Client
from util import dev_login


@pytest.mark.parametrize(
    ("user", "expected"),
    [
        (
            "admin",
            {
                "netid": "DEV_ADMIN",
                "privileges": ["admin"],
            },
        ),
        (
            "facstaff",
            {
                "netid": "DEV_FACSTAFF",
                "privileges": ["facstaff"],
            },
        ),
        (
            "user",
            {
                "netid": "DEV_USER",
                "privileges": [None],
            },
        ),
    ],
)
def test_initialize_user(client: Client, user: str, expected: dict) -> None:
    with dev_login(client, user):
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
        resp = client.get("/api/core/user/info")
        assert resp.status_code == 200
        assert resp.json["netid"] == expected["netid"]
        assert resp.json["privileges"] == expected["privileges"]
        assert resp.json["filterOptions"] == defaultOptions


@pytest.mark.parametrize(
    ("user", "new_netid", "expected"),
    [
        ("admin", "DEV_TEST1", 204),
        ("facstaff", "DEV_TEST2", 403),
        ("power", "DEV_TEST3", 403),
        ("user", "DEV_TEST4", 403),
        ("admin", "test5", 400),
    ],
)
def test_create_user(client: Client, user: str, new_netid: str, expected: int) -> None:
    with dev_login(client, user):
        resp = client.post(
            "/api/core/user", json={"netid": new_netid, "roles": ["facstaff"]}
        )
        assert resp.status_code == expected


@pytest.mark.parametrize(
    ("user", "expected"),
    [
        ("admin", 204),
        ("facstaff", 403),
        ("power", 403),
        ("user", 403),
        ("admin", 404),
    ],
)
def test_delete_user(client: Client, user: str, expected: int) -> None:
    with dev_login(client, user):
        randNum = random.randint(1000, 1000000)
        # generate a random test account
        test_acc_name = f"DEV_TEST{randNum}"

        if user == "admin":
            if expected == 404:  # delete non-existing user
                resp = client.delete("/api/core/user", json={"netid": test_acc_name})
                assert resp.status_code == expected
            else:
                # create a test account to delete
                resp = client.post(
                    "/api/core/user",
                    json={"netid": test_acc_name, "roles": ["facstaff"]},
                )
                assert resp.status_code == 204
                # delete the test account
                resp = client.delete("/api/core/user", json={"netid": test_acc_name})
                assert resp.status_code == expected
                resp = client.get(
                    f"/api/core/user/{test_acc_name}"
                )
                assert resp.status_code == 404
        else: 
            resp = client.delete(
                "/api/core/user", json={"netid": test_acc_name}
            )
            assert resp.status_code == expected

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
