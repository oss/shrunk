import time
import base64
from datetime import datetime, timezone, timedelta
import random

import pytest
from werkzeug.test import Client

from util import dev_login, create_link


@pytest.fixture
def test_link(client: Client) -> None:  # pylint: disable=too-many-statements
    """This test simulates the process of creating a link, adding two random aliases
    to it, deleting an alias, and then deleting the link."""

    with dev_login(client, "user"):
        # Create a link and get its ID
        resp = create_link(client, "title", "example.com")
        assert 200 <= resp.status_code < 300
        link_id = resp.json["id"]

        # Get the link info back and make sure it's correct
        resp = client.get(f"/api/core/link/{link_id}")
        assert 200 <= resp.status_code < 300
        assert resp.json["title"] == "title"
        assert resp.json["long_url"] == "https://example.com"
        assert len(resp.json["aliases"]) == 2
        for alias in resp.json["aliases"]:
            assert alias["alias"] in {alias0, alias1}
            if alias["alias"] == alias0:
                assert alias["description"] == "alias0"
            elif alias["alias"] == alias1:
                assert alias["description"] == "alias1"

        # Check that alias0 redirects correctly
        resp = client.get(f"/{alias0}")
        assert resp.status_code == 302
        assert resp.headers["Location"] == "https://example.com"

        # Set the link to expire 200 ms in the future
        expiration_time = datetime.now(timezone.utc) + timedelta(milliseconds=200)
        resp = client.patch(
            f"/api/core/link/{link_id}",
            json={
                "expiration_time": expiration_time.isoformat(),
            },
        )
        assert resp.status_code == 204

        # Wait 5 s
        time.sleep(5)

        # Check that alias0 does not redirect
        resp = client.get(f"/{alias0}")
        assert resp.status_code == 404

        # Check that alias1 does not redirect
        resp = client.get(f"/{alias1}")
        assert resp.status_code == 404

        # Unset the link expiration time
        resp = client.patch(
            f"/api/core/link/{link_id}",
            json={
                "expiration_time": None,
            },
        )
        assert resp.status_code == 204

        # Check that alias0 does not redirect (still deleted)
        resp = client.get(f"/{alias0}")
        assert resp.status_code == 404

        # Check that alias1 redirects (no longer expired)
        resp = client.get(f"/{alias1}")
        assert resp.status_code == 302
        assert resp.headers["Location"] == "https://example.com"

        # Delete the link
        resp = client.delete(f"/api/core/link/{link_id}")
        assert 200 <= resp.status_code < 300

        # Check that attempting to get the link info now results in a 404 error
        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.status_code == 404

        # Check that alias0 still doesn't redirect
        resp = client.get(f"/{alias0}")
        assert resp.status_code == 404

        # Check that alias1 doesn't redirect
        resp = client.get(f"/{alias1}")
        assert resp.status_code == 404


# def test_create_link_expiration(client: Client) -> None:
#     """
#     Test that we can create a link with an expiration time.

#     With the implementation of verifying links with Google Safe Browsing API,
#     this test would fail due to the fact that the link expired too fast
#     because the API needed time to respond. If there were recent changes to
#     the link creation pipeline and this test fails, try increasing the link
#     expiration time so that links don't expire before they are tested.

#     """

#     with dev_login(client, "admin"):
#         # Create a link that expires 400 ms in the future
#         expiration_time = datetime.now(timezone.utc) + timedelta(milliseconds=400)
#         resp = client.post(
#             "/api/core/link",
#             json={
#                 "long_url": "https://example.com",
#                 "expiration_time": expiration_time.isoformat(),
#             },
#         )

#         assert resp.status_code == 201
#         link_id = resp.json["id"]
#         alias0 = resp.json["alias"]

#         # Check that alias0 redirects correctly
#         resp = client.get(f"/{alias0}")
#         assert resp.status_code == 302
#         assert resp.headers["Location"] == "https://example.com"

#         # Sleep 5 seconds
#         time.sleep(5)

#         # Check that alias0 no longer exists
#         resp = client.get(f"/{alias0}")
#         assert resp.status_code == 404

#         # Unset the link expiration time
#         resp = client.patch(
#             f"/api/core/link/{link_id}",
#             json={
#                 "expiration_time": None,
#             },
#         )
#         assert resp.status_code == 204

#         # Check that alias0 redirects correctly
#         resp = client.get(f"/{alias0}")
#         assert resp.status_code == 302
#         assert resp.headers["Location"] == "https://example.com"


def test_create_link_org(client: Client) -> None:
    """
    Test that we can create a link with an organization as the owner.
    """

    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "testorg10"})
        assert resp.status_code == 200
        org_id = resp.json["id"]

        resp = client.post(
            "/api/core/link",
            json={
                "long_url": "https://example.com",
                "org_id": org_id,
            },
        )
        assert resp.status_code == 201
        link_id = resp.json["id"]
        alias = resp.json["alias"]

        # Check that the link redirects correctly
        resp = client.get(f"/{alias}")
        assert resp.status_code == 302
        assert resp.headers["Location"] == "https://example.com"

        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.status_code == 200
        assert resp.json["owner"]["_id"] == org_id
        assert resp.json["owner"]["type"] == "org"
        assert resp.json["owner"]["org_name"] == "testorg10"


def test_remove_acl_on_transfer_to_org(client: Client) -> None:
    """Test that org is removed from viewers/editors when transferring link ownership from a user to an org."""

    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "mycoolorg"})
        assert resp.status_code == 200
        org_id = resp.json["id"]
        resp = client.post(
            "/api/core/link",
            json={
                "title": "title",
                "long_url": "https://example.com",
                "viewers": [
                    {"_id": org_id, "type": "org"},
                    {"_id": "DEV_test_user", "type": "netid"},
                ],
                "editors": [{"_id": org_id, "type": "org"}],
            },
        )
        assert resp.status_code == 201
        link_id = resp.json["id"]

        resp = client.patch(
            f"/api/core/link/{link_id}", json={"owner": {"_id": org_id, "type": "org"}}
        )
        assert resp.status_code == 204
        resp = client.get(f"/api/core/link/{link_id}")
        assert len(resp.json["editors"]) == 0
        assert len(resp.json["viewers"]) == 1
        assert resp.json["viewers"][0]["_id"] == "DEV_test_user"


def test_transfer_from_org_to_user(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "testorg"})
        org_id = resp.json["id"]

        resp = client.put(
            f"/api/core/org/{org_id}/member/DEV_USER",
        )

        resp = client.post(
            "/api/core/link",
            json={
                "long_url": "https://example.com",
                "org_id": org_id,
            },
        )

        assert resp.status_code == 201
        link_id = resp.json["id"]

    with dev_login(client, "user"):
        resp = client.patch(
            f"/api/core/link/{link_id}",
            json={"owner": {"_id": "DEV_USER", "type": "netid"}},
        )
        assert resp.status_code == 403

    with dev_login(client, "admin"):
        resp = client.patch(
            f"/api/core/link/{link_id}",
            json={"owner": {"_id": "DEV_USER", "type": "netid"}},
        )
        assert resp.status_code == 204
        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.json["owner"]["_id"] == "DEV_USER"
        assert resp.json["owner"]["type"] == "netid"


def test_create_link_bad_long_url(client: Client) -> None:
    """Test that we cannot create a link with a banned long url."""

    long_url = "https://example.com"
    long_url_b32 = str(base64.b32encode(bytes(long_url, "utf8")), "utf8")

    with dev_login(client, "admin"):
        resp = client.put(f"/api/core/role/blocked_url/entity/{long_url_b32}", json={})
        assert resp.status_code == 204

    with dev_login(client, "user"):
        resp = client.post(
            "/api/core/link",
            json={
                "title": "title",
                "long_url": long_url,
            },
        )
        assert resp.status_code == 403


@pytest.mark.skip(reason="As of 3.1.0, you can no longer modify long_url links.")
def test_modify_link_bad_long_url(client: Client) -> None:
    long_url = "https://example.com"
    long_url_b32 = str(base64.b32encode(bytes(long_url, "utf8")), "utf8")

    with dev_login(client, "admin"):
        resp = client.put(f"/api/core/role/blocked_url/entity/{long_url_b32}", json={})
        assert resp.status_code == 204

    with dev_login(client, "user"):
        resp = create_link(client, "title", "https://rutgers.edu")
        assert resp.status_code == 201
        link_id = resp.json["id"]

    with dev_login(client, "user"):
        resp = client.patch(
            f"/api/core/link/{link_id}",
            json={
                "long_url": long_url,
            },
        )
        assert resp.status_code == 400


@pytest.mark.parametrize(
    ("long_url", "expected"),
    [
        ("google.com", True),
        ("https://google.com", True),
        ("example.com", False),
        ("https://example.com", False),
        ("https://example.com/path/to?some=thing", False),
    ],
)
def test_validate_long_url(client: Client, long_url: str, expected: bool) -> None:
    blocked_long_url = "https://example.com"
    blocked_long_url_b32 = str(
        base64.b32encode(bytes(blocked_long_url, "utf8")), "utf8"
    )

    with dev_login(client, "admin"):
        resp = client.put(
            f"/api/core/role/blocked_url/entity/{blocked_long_url_b32}", json={}
        )
        assert resp.status_code == 204

    long_url_b32 = str(base64.b32encode(bytes(long_url, "utf8")), "utf8")
    with dev_login(client, "user"):
        resp = client.get(f"/api/core/link/validate_long_url/{long_url_b32}")
        assert resp.status_code == 200
        assert resp.json["valid"] is expected


@pytest.mark.parametrize(
    ("alias", "expected"),
    [
        ("link", False),  # Endpoint name
        ("abcdef123", True),  # Should be valid
    ],
)
def test_validate_alias(client: Client, alias: str, expected: bool) -> None:
    alias_b32 = str(base64.b32encode(bytes(alias, "utf8")), "utf8")
    with dev_login(client, "user"):
        resp = client.get(f"/api/core/link/validate_reserved_alias/{alias_b32}")
        assert resp.status_code == 200
        assert resp.json["valid"] is expected


@pytest.mark.parametrize(
    ("alias", "expected"),
    [
        (10, False),  # Wrong type
        ("aaa", False),  # Too short
        ("!!!!!!!!", False),  # Bad characters
        ("!!!!32i5u!", False),  # Bad characters
        ("asu3h@4th", False),  # Bad characters
        ("asu3&*(%#@4", False),  # Bad characters
        ("link", False),  # Endpoint name
        ("abcdef123", True),
        ("abc.def123", True),
        ("abc-d123", True),
        ("ab___23", True),
        ("10asodiuhadoias", True),
    ],
)
def test_create_bad_alias(client: Client, alias: str, expected: bool) -> None:
    with dev_login(client, "power"):
        resp = client.post(
            "/api/core/link",
            json={
                "title": "title",
                "long_url": "https://example.com",
                "alias": alias,
            },
        )

        if expected:
            assert resp.status_code == 201
        else:
            assert resp.status_code == 400


def test_create_alias_no_power_user(client: Client) -> None:
    with dev_login(client, "user"):
        resp = client.post(
            "/api/core/link",
            json={
                "title": "title",
                "long_url": "https://example.com",
                "alias": "hitestest",
            },
        )

        assert resp.status_code == 403


def test_link_not_owner(client: Client) -> None:
    """Test that a link cannot be manipulated by a non-owner."""

    # Create a link as DEV_ADMIN
    with dev_login(client, "admin"):
        # Create a link and get its ID
        resp = create_link(client, "title", "example.com")
        assert 200 <= resp.status_code < 300
        link_id = resp.json["id"]

    # Log in DEV_USER and check that we cannot view/edit the link or its alias
    with dev_login(client, "user"):
        # Check that we cannot get link info
        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.status_code == 403

        # Check that we cannot get link visits
        resp = client.get(f"/api/core/link/{link_id}/visits")
        assert resp.status_code == 403

        # Check that we cannot get link overall stats
        resp = client.get(f"/api/core/link/{link_id}/stats")
        assert resp.status_code == 403

        # Check that we cannot get link visit stats
        resp = client.get(f"/api/core/link/{link_id}/stats/visits")
        assert resp.status_code == 403

        # Check that we cannot get link GeoIP stats
        resp = client.get(f"/api/core/link/{link_id}/stats/geoip")
        assert resp.status_code == 403

        # Check that we cannot get link browser stats
        resp = client.get(f"/api/core/link/{link_id}/stats/browser")
        assert resp.status_code == 403

        # Check that we cannot clear visits
        resp = client.post(f"/api/core/link/{link_id}/clear_visits")
        assert resp.status_code == 403

        # Check that we cannot delete the link
        resp = client.delete(f"/api/core/link/{link_id}")
        assert resp.status_code == 403


def test_get_link_info_bad_id(client: Client) -> None:
    with dev_login(client, "user"):
        resp = client.get("/api/core/link/not_an_id")
        assert resp.status_code == 404


def test_get_link_nonexistent(client: Client) -> None:
    with dev_login(client, "user"):
        resp = client.get("/api/core/link/5fa30b6801cc0db00872569b")
        assert resp.status_code == 404


def test_modify_link_nonexistent(client: Client) -> None:
    with dev_login(client, "user"):
        resp = client.patch(
            "/api/core/link/5fa30b6801cc0db00872569b",
            json={
                "title": "new title",
            },
        )
        assert resp.status_code == 404


def test_delete_link_nonexistent(client: Client) -> None:
    with dev_login(client, "user"):
        resp = client.delete("/api/core/link/5fa30b6801cc0db00872569b")
        assert resp.status_code == 404


def test_clear_visits_nonexistent(client: Client) -> None:
    with dev_login(client, "user"):
        resp = client.post("/api/core/link/5fa30b6801cc0db00872569b/clear_visits")
        assert resp.status_code == 404


def test_get_deleted(client: Client) -> None:
    with dev_login(client, "user"):
        resp = client.post(
            "/api/core/link",
            json={
                "title": "title",
                "long_url": "https://example.com",
            },
        )
        assert resp.status_code == 201
        link_id = resp.json["id"]
        alias0 = resp.json["alias"]

        # Delete the link
        resp = client.delete(f"/api/core/link/{link_id}")
        assert resp.status_code == 204

        # Check that the link info is no longer accessible
        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.status_code == 404

    with dev_login(client, "admin"):
        # Get the link info as admin, check that the alias exists
        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.status_code == 200

        info = resp.json
        assert info["alias"] == alias0
        assert info["deleted"] is True


def test_visits(client: Client) -> None:  # pylint: disable=too-many-statements
    def assert_visits(url: str, total_visits: int, unique_visits: int) -> None:
        resp = client.get(url)
        assert resp.status_code == 200
        assert resp.json["total_visits"] == total_visits
        assert resp.json["unique_visits"] == unique_visits

    with dev_login(client, "user"):
        resp = client.post(
            "/api/core/link",
            json={
                "title": "title",
                "long_url": "https://example.com",
            },
        )
        assert resp.status_code == 201
        link_id = resp.json["id"]
        alias0 = resp.json["alias"]

        resp = client.get(f"/{alias0}")
        assert resp.status_code == 302
        resp = client.get(f"/{alias0}")
        resp = client.get(f"/{alias0}")

        # Get the link stats. Check that we have 3 visits and 1 unique visit
        assert_visits(f"/api/core/link/{link_id}/stats", 3, 1)

        # Get the anonymized visits, make sure they make sense
        resp = client.get(f"/api/core/link/{link_id}/visits")
        assert resp.status_code == 200
        assert all(visit["link_id"] == link_id for visit in resp.json["visits"])
        assert len(resp.json["visits"]) == 3
        assert sum(1 for visit in resp.json["visits"] if visit["alias"] == alias0) == 3

        # Get the visit stats data
        resp = client.get(f"/api/core/link/{link_id}/stats/visits")
        assert resp.status_code == 200
        assert len(resp.json["visits"]) == 1
        assert resp.json["visits"][0]["first_time_visits"] == 1
        assert resp.json["visits"][0]["all_visits"] == 3

        resp = client.get(f"/api/core/link/{link_id}/stats/geoip")
        assert resp.status_code == 200

        resp = client.get(f"/api/core/link/{link_id}/stats/browser")
        assert resp.status_code == 200

        # Clear visits. Check that everything has gone back to 0
        resp = client.post(f"/api/core/link/{link_id}/clear_visits")
        assert resp.status_code == 204
        assert_visits(f"/api/core/link/{link_id}/stats", 0, 0)

        # When DNT is set, the right amount of unique visits are set
        resp = client.get(f"/{alias0}", headers={"DNT": "1"})
        assert resp.status_code == 302


def test_create_link_acl(client: Client) -> None:  # pylint: disable=too-many-statements
    """This test simulates the process of creating a link with ACL options and testing if the permissions works"""

    with dev_login(client, "facstaff"):

        def check_create(body):
            resp = client.post("/api/core/link", json=body)
            if resp.json is None:
                return None, resp.status_code
            if "error" in resp.json:
                return resp.json, resp.status_code
            link_id = resp.json["id"]
            status = resp.status_code
            resp = client.get(f"/api/core/link/{link_id}")
            return resp.json, status

        # make sure Editors are viewers
        link, status = check_create(
            {
                "title": "title",
                "long_url": "https://example.com",
                "editors": [{"_id": "DEV_ADMIN", "type": "netid"}],
            }
        )
        assert 200 <= status < 300
        assert len(link["editors"]) == 1

        # viewer not editor
        link, status = check_create(
            {
                "title": "title",
                "long_url": "https://example.com",
                "viewers": [{"_id": "DEV_ADMIN", "type": "netid"}],
            }
        )
        assert 200 <= status < 300
        assert len(link["viewers"]) == 1

        # deduplicate
        link, status = check_create(
            {
                "title": "title",
                "long_url": "https://example.com",
                "viewers": [
                    {"_id": "DEV_ADMIN", "type": "netid"},
                    {"_id": "DEV_ADMIN", "type": "netid"},
                ],
            }
        )
        assert 200 <= status < 300
        assert len(link["viewers"]) == 2

        # orgs must be objectid
        link, status = check_create(
            {
                "title": "title",
                "long_url": "https://example.com",
                "viewers": [{"_id": "DEV_ADMIN", "type": "org"}],
            }
        )
        assert status == 400
        assert "error" in link

        # orgs disallows invalid org
        link, status = check_create(
            {
                "title": "title",
                "long_url": "https://example.com",
                "viewers": [{"_id": "5fbed163b7202e4c33f01a93", "type": "org"}],
            }
        )
        assert status == 400
        assert "error" in link

        # org allows valid org
        resp = client.post("/api/core/org", json={"name": "testorg11"})
        assert 200 <= resp.status_code <= 300
        _id = resp.json["id"]

        link, status = check_create(
            {
                "title": "title",
                "long_url": "https://example.com",
                "viewers": [{"_id": _id, "type": "org"}],
            }
        )
        assert 200 <= status <= 300
        assert len(link["viewers"]) == 1
        assert len(link["editors"]) == 0


def test_update_link_acl(client: Client) -> None:  # pylint: disable=too-many-statements
    """This test simulates the process of creating a link with ACL options and testing if the permissions works"""

    with dev_login(client, "facstaff"):
        resp = client.post(
            "/api/core/link",
            json={"title": "title", "long_url": "https://example.com"},
        )
        assert 200 <= resp.status_code <= 300
        link_id = resp.json["id"]

        def mod_acl(action, entry, acl):
            resp = client.patch(
                f"/api/core/link/{link_id}/acl",
                json={"action": action, "acl": acl, "entry": entry},
            )
            print(resp.json)
            if resp.status_code >= 400:
                return resp.json, resp.status_code
            status = resp.status_code
            resp = client.get(f"/api/core/link/{link_id}")
            return resp.json, status

        owner = {"_id": "DEV_FACSTAFF", "type": "netid"}
        person = {"_id": "DEV_roofus", "type": "netid"}
        person2 = {"_id": "DEV_doofus", "type": "netid"}
        inv_org = {"_id": "not_obj_id", "type": "org"}
        inv_org2 = {"_id": "5fbed163b7202e4c33f01a93", "type": "org"}

        # add viewer
        link, status = mod_acl("add", person, "viewers")
        assert 200 <= status <= 300
        assert len(link["viewers"]) == 1
        assert len(link["editors"]) == 0

        # duplicates should be ignored
        link, status = mod_acl("add", person, "viewers")
        assert 200 <= status <= 300
        assert len(link["viewers"]) == 1
        assert len(link["editors"]) == 0

        # should be unable to add owner
        link, status = mod_acl("add", owner, "viewers")
        print(link)
        assert status == 204
        assert len(link["viewers"]) == 1
        assert len(link["editors"]) == 0

        # remove viewer works
        mod_acl("add", person2, "viewers")
        link, status = mod_acl("remove", person, "viewers")
        assert 200 <= status <= 300
        assert len(link["viewers"]) == 1
        assert len(link["editors"]) == 0
        # assert correct one is removed
        assert link["viewers"][0]["_id"] == person2["_id"]
        mod_acl("remove", person2, "viewers")

        # add editor adds viewer
        link, status = mod_acl("add", person, "editors")
        assert 200 <= status <= 300
        assert len(link["editors"]) == 1
        assert len(link["viewers"]) == 1
        # remove viewer removes editor
        link, status = mod_acl("remove", person, "viewers")
        assert 200 <= status <= 300
        assert len(link["viewers"]) == 0
        assert len(link["editors"]) == 0

        # remove editor doesn't remove viewer
        mod_acl("add", person, "editors")
        link, status = mod_acl("remove", person, "editors")
        assert 200 <= status <= 300
        assert len(link["viewers"]) == 1
        assert len(link["editors"]) == 0
        mod_acl("remove", person, "viewers")

        # remove nonexistant doesn't throw exception
        link, status = mod_acl("remove", person, "editors")
        assert status < 500
        assert len(link["viewers"]) == 0
        assert len(link["editors"]) == 0
        mod_acl("remove", person, "viewers")

        # add org invalid id rejected
        link, status = mod_acl("add", inv_org, "viewers")
        assert status == 400

        link, status = mod_acl("add", inv_org2, "viewers")
        assert status == 400

        # add valid org
        resp = client.post("/api/core/org", json={"name": "testorg11"})
        assert 200 <= resp.status_code <= 300
        org_id = resp.json["id"]
        link, status = mod_acl("add", {"_id": org_id, "type": "org"}, "viewers")
        assert 200 <= status <= 300
        assert len(link["viewers"]) == 1
        assert len(link["editors"]) == 0

        _, status = mod_acl("remove", {"_id": org_id, "type": "org"}, "viewers")
        assert 200 <= status <= 300

        # add owner doesn't actually add them to the list

        link, status = mod_acl(
            "add", {"_id": "DEV_FACSTAFF", "type": "netid"}, "editors"
        )
        assert 200 <= status <= 300
        assert len(link["viewers"]) == 0
        assert len(link["editors"]) == 0


def test_acl(client: Client) -> None:  # pylint: disable=too-many-statements
    link_id = ""
    alias = ""
    with dev_login(client, "admin"):
        # create org
        resp = client.post("/api/core/org", json={"name": "testorg12"})
        assert 200 <= resp.status_code <= 300
        org_id = resp.json["id"]

        # add whitelisted to it
        netid = "DEV_FACSTAFF"  # todo, no whitelisted dev login
        resp = client.put(f"/api/core/org/{org_id}/member/{netid}")
        assert 200 <= resp.status_code <= 300

        # create link with editor: user, viewer: org
        resp = client.post(
            "/api/core/link",
            json={
                "title": "testlink2333",
                "long_url": "https://example.com",
                "editors": [{"_id": "DEV_USER", "type": "netid"}],
                "viewers": [{"_id": org_id, "type": "org"}],
            },
        )
        assert 200 <= resp.status_code <= 300
        link_id = resp.json["id"]
        alias = resp.json["alias"]

        resp = client.get(f"/api/core/link/{link_id}")

    permissions_table = [
        {
            "user": "user",  # editor
            "delete": False,
            "delete_alias": False,
            "clear_visits": False,
            "update_url": True,
            "update_acl": True,
            "create_alias": True,
            "get": True,
            "view_stats": True,
            "view_alias_stats": True,
        },
        {
            "user": "facstaff",  # viewer (shared through org)
            "delete": False,
            "delete_alias": False,
            "clear_visits": False,
            "update_url": False,
            "update_acl": False,
            "create_alias": False,
            "get": True,
            "view_stats": True,
            "view_alias_stats": True,
        },
        {
            "user": "power",  # not shared
            "delete": False,
            "delete_alias": False,
            "clear_visits": False,
            "update_url": False,
            "update_acl": False,
            "create_alias": False,
            "get": False,
            "view_stats": False,
            "view_alias_stats": False,
        },
    ]

    def assert_access(desired, code):
        if desired:
            assert 200 <= code <= 300
        else:
            assert code == 403

    for user in permissions_table:
        print(user["user"])

        with dev_login(client, user["user"]):
            resp = client.delete(f"/api/core/link/{link_id}")
            assert resp.status_code == 403

            resp = client.post(f"/api/core/link/{link_id}/clear_visits")
            assert resp.status_code == 403

            resp = client.patch(
                f"/api/core/link/{link_id}",
                json={
                    "long_url": "https://example.com?rand="
                    + str(random.randrange(0, 1000))
                },
            )
            assert_access(user["update_url"], resp.status_code)

            resp = client.patch(
                f"/api/core/link/{link_id}/acl",
                json={
                    "entry": {
                        "_id": "DEV_roofus" + str(random.randrange(0, 1000)),
                        "type": "netid",
                    },
                    "acl": "viewers",
                    "action": "add",
                },
            )
            assert_access(user["update_acl"], resp.status_code)

            resp = client.get(f"/api/core/link/{link_id}")
            assert_access(user["get"], resp.status_code)

            for endpoint in [
                "stats",
                "stats/browser",
                "stats/geoip",
                "stats/visits",
                "visits",
            ]:
                resp = client.get(f"/api/core/link/{link_id}/{endpoint}")
                assert_access(user["view_stats"], resp.status_code)

    with dev_login(client, "admin"):
        client.post(
            "/api/core/link",
            json={
                "owner": {"_id": org_id, "type": "org"},
            },
        )
    with dev_login(client, "user"):  # test user org member permissions
        resp = client.delete(f"/api/core/link/{link_id}")
        assert resp.status_code == 403

        resp = client.post(f"/api/core/link/{link_id}/clear_visits")
        assert resp.status_code == 403

        resp = client.patch(
            f"/api/core/link/{link_id}",
            json={
                "long_url": "https://example.com?rand=" + str(random.randrange(0, 1000))
            },
        )
        assert_access(True, resp.status_code)

        resp = client.patch(
            f"/api/core/link/{link_id}/acl",
            json={
                "entry": {
                    "_id": "DEV_roofus" + str(random.randrange(0, 1000)),
                    "type": "netid",
                },
                "acl": "viewers",
                "action": "add",
            },
        )

        assert_access(True, resp.status_code)


def test_case_sensitive_duplicate_aliases(client: Client) -> None:
    """
    Ban the future use of creating case-sensitive aliases
    (https://gitlab.rutgers.edu/MaCS/OSS/shrunk/-/issues/205)
    """

    with dev_login(client, "admin"):
        resp = create_link(
            client, "title", "https://playvalorant.com/", alias="VALORANT"
        )
        assert resp.status_code == 201
        assert resp.json["alias"] == "valorant"

        resp = create_link(
            client, "title", "https://playvalorant.com/", alias="valorant"
        )
        assert resp.status_code == 400


def test_revert_expiration_link(client: Client) -> None:
    with dev_login(client, "user"):
        # Add link with expiration time set 500 milliseconds in the future
        expiration_time = datetime.now(timezone.utc) + timedelta(milliseconds=500)
        resp = client.post(
            "/api/core/link",
            json={
                "title": "title",
                "long_url": "https://sample.com",
                "expiration_time": expiration_time.isoformat(),
            },
        )

        assert resp.status_code == 201, "Failed to create link"
        link_id = resp.json["id"]

        # Restore link
        resp = client.post(f"/api/core/link/{link_id}/revert")
        assert resp.status_code == 204, "Failed to restore link"

        # Fetch link and ensure expiration time field is set to None
        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.status_code == 200, "Failed to fetch link"
        assert resp.json["expiration_time"] == None, "Expiration time is not None"


def test_visit_link_from_alias_with_caps(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/link",
            json={
                "title": "title",
                "long_url": "https://sample.com",
                "alias": "minecraft",
            },
        )

        resp = client.get("/minecraft")
        assert resp.status_code == 302
        resp = client.get("/Minecraft")
        assert resp.status_code == 302
        resp = client.get("/MiNeCraft")
        assert resp.status_code == 302
        
        
def test_org_to_org_transfer(client: Client) -> None:
    with dev_login(client, "admin"):
        # Create two organizations
        resp = client.post("/api/core/org", json={"name": "org1"})
        assert resp.status_code == 200
        org1_id = resp.json["id"]

        resp = client.post("/api/core/org", json={"name": "org2"})
        assert resp.status_code == 200
        org2_id = resp.json["id"]

        # Create a link owned by org1
        resp = client.post(
            "/api/core/link",
            json={
                "long_url": "https://example.com",
                "org_id": org1_id,
            },
        )
        assert resp.status_code == 201
        link_id = resp.json["id"]

        # Transfer ownership to org2
        resp = client.patch(
            f"/api/core/link/{link_id}",
            json={"owner": {"_id": org2_id, "type": "org"}},
        )
        assert resp.status_code == 204

        # Check that the link info reflects the new owner
        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.status_code == 200
        assert resp.json["owner"]["_id"] == org2_id
        assert resp.json["owner"]["type"] == "org"
        

def test_owner_transfer(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "testorg"})
        assert resp.status_code == 200
        org_id = resp.json["id"]

        resp = client.post("/api/core/org", json={"name": "testorg2"})
        assert resp.status_code == 200
        org2_id = resp.json["id"]

        resp = client.post(
            "/api/core/link",
            json={
                "title": "title",
                "long_url": "https://example.com",
                "org_id": org_id,
            },
        )
        assert resp.status_code == 201
        link_id = resp.json["id"]

        client.post(f"/api/core/org/{org_id}/member/DEV_USER")
        
    with dev_login(client, "user"):
        # Attempt to transfer ownership to a user
        resp = client.patch(
            f"/api/core/link/{link_id}",
            json={"owner": {"_id": "DEV_USER", "type": "netid"}},
        )
        assert resp.status_code == 403
        
        #test transfer to org that user is not a member of
        resp = client.post("/api/core/link", json={
            "title": "title",
            "long_url": "https://example.com"})
        assert resp.status_code == 201
        link_id2 = resp.json["id"]
        
        resp = client.patch(
            f"/api/core/link/{link_id2}",
            json={"owner": {"_id": org2_id, "type": "org"}},
        )
        assert resp.status_code == 403
