import base64
import json
from datetime import datetime, timezone
from io import BytesIO

import pytest
import requests
from bson import ObjectId
from flask import Flask
from werkzeug.test import Client

from util import dev_login, create_link
from shrunk.client import ShrunkClient


@pytest.fixture(autouse=True)
def safe_browsing(app: Flask, monkeypatch: pytest.MonkeyPatch) -> None:
    """Exercise the security workflow without depending on Google or a real key."""
    security = getattr(app, "client").security
    monkeypatch.setattr(security, "security_measures_on", True)
    monkeypatch.setattr(security, "latest_status", "ON")
    monkeypatch.setattr(security, "google_safe_browsing_api", "test-api-key")

    def lookup(url: str, *, data: str, timeout: int) -> requests.Response:
        assert url == "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=test-api-key"
        assert timeout == 30
        entries = json.loads(data)["threatInfo"]["threatEntries"]
        unsafe_urls = {
            "http://malware.testing.google.test/testing/malware/*",
            "http://malware.testing.google.test/testing/malware/*/",
        }
        body = {"matches": [{"threatType": "MALWARE"}]} if any(e["url"] in unsafe_urls for e in entries) else {}
        response = requests.Response()
        response.status_code = 200
        response.raw = BytesIO(json.dumps(body).encode())
        return response

    monkeypatch.setattr("shrunk.client.security.requests.post", lookup)


def test_pending_links_are_deduplicated_and_audited(app: Flask, db: ShrunkClient) -> None:
    security = db.security
    link = {"long_url": "https://unsafe.example.test", "title": "unsafe"}
    link_id = security.create_pending_link(link.copy())
    assert link_id is not None
    assert security.create_pending_link(link.copy()) is None
    assert db.db.unsafe_links.count_documents({}) == 1
    assert security.get_number_of_pending_links() == 1
    assert security.get_link_status(link_id) == "pending"
    assert security.get_unsafe_link_document(link_id)["netid_of_last_modifier"] is None

    with app.app_context():
        before = datetime.now(timezone.utc)
        security.reject_link("DEV_ADMIN", link_id)
        security.consider_link(link_id, "DEV_REVIEWER")
        after = datetime.now(timezone.utc)

    stored = security.get_unsafe_link_document(link_id)
    assert stored["status"] == "pending"
    history = stored["security_update_history"]
    assert len(history) == 2
    for event, old, new, actor in zip(
        history, ["pending", "denied"], ["denied", "pending"], ["DEV_ADMIN", "DEV_REVIEWER"], strict=True
    ):
        assert event["status_changed_from"] == old
        assert event["status_changed_to"] == new
        assert event["netid_of_modifier"] == actor
        # BSON stores datetime values with millisecond precision.
        assert before.replace(microsecond=(before.microsecond // 1000) * 1000) <= event["timestamp"] <= after


def test_promote_link_creates_real_link(app: Flask, db: ShrunkClient) -> None:
    """promote_link must actually create a fetchable link document, not just
    flip the unsafe_links status while silently failing to create() one."""
    with app.app_context():
        oid = db.security.create_pending_link(
            {
                "title": "phish",
                "alias": "regressionpromote1",
                "long_url": "http://malicious.example.test/regression",
                "timeCreated": datetime.now(timezone.utc),
                "visits": 0,
                "unique_visits": 0,
                "deleted": False,
                "creator_ip": "1.2.3.4",
                "expiration_time": None,
                "owner": {"_id": "DEV_USER", "type": "netid"},
                "domain": "",
                "viewers": [],
                "editors": [],
                "is_tracking_pixel_link": False,
                "created_using_api": False,
            }
        )
        assert oid is not None

        new_link_id = db.security.promote_link("DEV_ADMIN", oid)
        real_link = db.links.get_link_info(new_link_id)
        assert real_link["title"] == "phish"
        assert real_link["alias"] == "regressionpromote1"
        assert real_link["owner"] == {"_id": "DEV_USER", "type": "netid"}


def test_pending_queries_filter_by_status_and_url(db: ShrunkClient) -> None:
    security = db.security
    ids: list[ObjectId] = []
    for i in range(3):
        link_id = security.create_pending_link({"long_url": f"https://example.com/{i}", "title": str(i)})
        assert link_id is not None
        ids.append(link_id)
    security.reject_link("reviewer", ids[0])
    security.change_link_status(ids[1], "reviewer", "approved")
    assert [link["_id"] for link in security.get_pending_links()] == [ids[2]]
    assert security.get_number_of_pending_links() == 1
    for i, status in enumerate(["denied", "approved", "pending"]):
        assert security.get_link_status(ids[i]) == status
        assert security.get_status_of_url(f"https://example.com/{i}") == status
        assert security.url_exists_in_collection(f"https://example.com/{i}") is True
        assert security.url_not_approved(f"https://example.com/{i}") is (status != "approved")
    assert security.get_status_of_url("https://example.com/missing") is None
    assert security.url_exists_in_collection("https://example.com/missing") is False
    assert security.url_not_approved("https://example.com/missing") is False


def test_security_risk_client_method(client: Client) -> None:
    unsafe_link = "http://malware.testing.google.test/testing/malware/*"
    unsafe_link_b32 = str(base64.b32encode(bytes(unsafe_link, "utf8")), "utf8")

    regular_link = "https://google.com/"
    regular_link_b32 = str(base64.b32encode(bytes(regular_link, "utf8")), "utf8")

    with dev_login(client, "admin"):
        # Create a link and get its message
        resp = client.get(f"/api/core/security/security_test/{unsafe_link_b32}")
        assert resp.json is not None
        assert resp.status_code == 200
        assert resp.json["detected"]

        # Creating a link with a regular link should not be forbidden
        resp = client.get(f"/api/core/security/security_test/{regular_link_b32}")
        assert resp.json is not None
        assert resp.status_code == 200
        assert not resp.json["detected"]

    with dev_login(client, "user"):
        # A user that is not an admin cannot use the security_test endpoint
        resp = client.get(f"/api/core/security/security_test/{unsafe_link_b32}")
        assert resp.status_code == 403


@pytest.mark.parametrize(("permission"), ["user", "facstaff", "power"])
def test_user_and_admin_security_link_abilities(client: Client, permission: str) -> None:
    unsafe_link = "http://malware.testing.google.test/testing/malware/*"
    unsafe_link_title = "first unsafe link"
    regular_link = "https://google.com"

    with dev_login(client, permission):
        # a user tries to shrink a link detected to be unsafe
        # this could be any user (admin, facstaff)
        resp = client.post(
            "/api/core/link",
            json={"title": unsafe_link_title, "long_url": unsafe_link},
        )

        # this is a forbidden action. the link will then
        # become a pending link in the unsafe_links collection
        assert resp.status_code == 403

    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/link",
            json={"title": unsafe_link_title, "long_url": unsafe_link},
        )

        # an admin cannot accidentally post an unsafe link
        # without first explicitly stating to bypass security
        assert resp.status_code == 403

        # when an admin specifies that a regular link should bypass
        # security, go through with the request
        resp = client.post(
            "/api/core/link",
            json={
                "title": unsafe_link_title,
                "long_url": regular_link,
                "bypass_security_measures": True,
            },
        )
        assert resp.json is not None
        assert resp.status_code == 201
        link_id = resp.json["id"]

        # test that the link was made successfully after forcing bypass
        resp = client.get(f"/api/core/link/{link_id}")
        assert resp.json is not None
        assert resp.status_code == 200
        assert resp.json["title"] == unsafe_link_title


@pytest.mark.parametrize(("permission"), ["user", "facstaff", "power"])
def test_security_api_permissions(client: Client, permission: str) -> None:
    with dev_login(client, permission):
        resp = client.get("/api/core/security/pending_links")

        # regular users cannot fetch pending list
        assert resp.status_code == 403
        assert resp.json is not None
        assert resp.json["error"]["code"] == "PERMISSION_DENIED"

        # we post a random link so that we have an
        # objectID to work with. it does not matter what it is,
        # we just need an objectID to work with in order to call endpoints
        random_link = "http://google.com"
        resp = client.post("/api/core/link", json={"title": "random", "long_url": random_link})
        assert resp.json is not None
        link_id = resp.json["id"]

        resp = client.patch(f"/api/core/security/promote/{link_id}")
        assert resp.status_code == 403
        resp = client.get(f"/api/core/security/status/{link_id}")
        assert resp.status_code == 403
        resp = client.patch(f"/api/core/security/reject/{link_id}")
        assert resp.status_code == 403
        resp = client.patch("/api/core/security/toggle")
        assert resp.status_code == 403
        resp = client.get("/api/core/security/status")
        assert resp.status_code == 403


def test_verification_process(client: Client) -> None:
    unsafe_link = "http://malware.testing.google.test/testing/malware/*"
    second_unsafe_link = "http://malware.testing.google.test/testing/malware/*/"

    with dev_login(client, "user"):
        resp = create_link(client, "first unsafe link", unsafe_link)
        assert resp.status_code == 403
        resp = create_link(client, "second unsafe link", second_unsafe_link)
        assert resp.status_code == 403

    with dev_login(client, "admin"):
        resp = client.get("/api/core/security/pending_links")
        assert resp.json is not None
        assert resp.status_code == 200
        assert resp.json["pendingLinks"]
        assert len(resp.json["pendingLinks"]) == 2

        # check that unsafe link document is correct
        unsafe_link_document = resp.json["pendingLinks"][0]
        unsafe_link_id = unsafe_link_document["_id"]
        assert unsafe_link_document["title"] == "first unsafe link"
        assert unsafe_link_document["long_url"] == unsafe_link

        # check that second unsafe link document is correct
        second_unsafe_link_document = resp.json["pendingLinks"][1]
        second_unsafe_link_id = second_unsafe_link_document["_id"]
        assert second_unsafe_link_document["title"] == "second unsafe link"
        assert second_unsafe_link_document["long_url"] == second_unsafe_link

        # check that default status is pending for both unsafe links
        resp = client.get(f"/api/core/security/status/{unsafe_link_id}")
        assert resp.json is not None
        assert resp.status_code == 200
        assert resp.json["status"] == "pending"
        resp = client.get(f"/api/core/security/status/{second_unsafe_link_id}")
        assert resp.json is not None
        assert resp.status_code == 200
        assert resp.json["status"] == "pending"

        # test that the link hasn't made through as a regular link
        # via a call to the link API
        resp = client.get(f"/api/core/link/{unsafe_link_id}")
        assert resp.status_code == 404

        # check that pending link status promotion works
        resp = client.patch(f"/api/core/security/promote/{unsafe_link_id}")
        assert resp.status_code == 200
        resp = client.get(f"/api/core/security/status/{unsafe_link_id}")
        assert resp.json is not None
        assert resp.status_code == 200
        assert resp.json["status"] == "approved"

        # promoted unsafe link cannot be rejected
        resp = client.patch(f"/api/core/security/reject/{unsafe_link_id}")
        assert resp.status_code == 409

        # =======================Second Unsafe Link==================

        # test rejection of a pending link
        resp = client.patch(f"/api/core/security/reject/{second_unsafe_link_id}")
        assert resp.status_code == 200
        resp = client.get(f"/api/core/security/status/{second_unsafe_link_id}")
        assert resp.json is not None
        assert resp.status_code == 200
        assert resp.json["status"] == "denied"
        resp = client.get(f"/api/core/link/{second_unsafe_link_id}")
        assert resp.status_code == 404


def test_toggle_security(client: Client) -> None:
    unsafe_link = "http://malware.testing.google.test/testing/malware/*"
    unsafe_link_title = "unsafe link"

    with dev_login(client, "admin"):
        # we can get the status of security measures
        resp = client.get("/api/core/security/status")
        assert resp.status_code == 200
        assert resp.get_data(as_text=True) == "ON"

        # toggling security measures works
        resp = client.patch("/api/core/security/toggle")
        assert resp.status_code == 200
        resp = client.get("/api/core/security/status")
        assert resp.status_code == 200
        assert resp.get_data(as_text=True) != "ON"

    with dev_login(client, "user"):
        # when security measures are off, users can post unsafe links
        resp = client.post(
            "/api/core/link",
            json={"title": unsafe_link_title, "long_url": unsafe_link},
        )
        assert resp.status_code == 201

    with dev_login(client, "admin"):
        resp = client.patch("/api/core/security/toggle")
        assert resp.status_code == 200

        resp = client.get("/api/core/security/status")
        assert resp.status_code == 200
        assert resp.get_data(as_text=True) == "ON"

    with dev_login(client, "user"):
        # when security measures are toggled on, users cannot post unsafe links
        resp = client.post(
            "/api/core/link",
            json={
                "title": "IM GOING TO HACK RUTGERS LMAO !!!!!!!!! WOOOOOOo",
                "long_url": unsafe_link,
            },
        )
        assert resp.status_code == 403


@pytest.mark.parametrize("owner_type", ["netid", "org"])
def test_pending_links_return_owner_and_preserve_it_on_approval(client: Client, owner_type: str) -> None:
    unsafe_url = "http://malware.testing.google.test/testing/malware/*"
    with dev_login(client, "facstaff" if owner_type == "org" else "user"):
        owner_id = "DEV_FACSTAFF" if owner_type == "org" else "DEV_USER"
        body = {"title": "Owner contract", "long_url": unsafe_url}
        if owner_type == "org":
            org = client.post("/api/core/org", json={"name": "Security review organization"})
            assert org.status_code == 200
            assert org.json is not None
            owner_id = org.json["id"]
            body["org_id"] = owner_id
        assert client.post("/api/core/link", json=body).status_code == 403
    with dev_login(client, "admin"):
        pending = client.get("/api/core/security/pending_links")
        assert pending.status_code == 200
        assert pending.json is not None
        assert len(pending.json["pendingLinks"]) == 1
        link = pending.json["pendingLinks"][0]
        assert isinstance(link["_id"], str)
        assert link["owner"] == {"_id": owner_id, "type": owner_type}
        assert "netid" not in link
        approved = client.patch(f"/api/core/security/promote/{link['_id']}")
        assert approved.status_code == 200
        assert approved.json is not None
        real = client.get(f"/api/core/link/{approved.json['_id']}")
        assert real.status_code == 200
        assert real.json is not None
        assert real.json["owner"]["_id"] == owner_id
        assert real.json["owner"]["type"] == owner_type
        assert client.get("/api/core/security/pending_links").json == {"pendingLinks": []}

    with dev_login(client, "facstaff" if owner_type == "org" else "user"):
        recreated = client.post("/api/core/link", json=body)
        assert recreated.status_code == 201
        assert recreated.json is not None
        real = client.get(f"/api/core/link/{recreated.json['id']}")
        assert real.status_code == 200
        assert real.json is not None
        assert real.json["owner"]["_id"] == owner_id
        assert real.json["owner"]["type"] == owner_type


@pytest.mark.parametrize("failure", ["http", "timeout", "connection"])
def test_google_failure_api_creation_never_logs_key(
    client: Client, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture, failure: str
) -> None:
    dummy_url = "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=test-api-key"

    def lookup(*_args: object, **_kwargs: object) -> requests.Response:
        if failure == "timeout":
            raise requests.Timeout(dummy_url)
        if failure == "connection":
            raise requests.ConnectionError(dummy_url)
        result = requests.Response()
        result.status_code = 403
        result.url = dummy_url
        result.raw = BytesIO(b"{}")
        return result

    def head(*_args: object, **_kwargs: object) -> None:
        raise requests.Timeout("Simulated HEAD failure")

    monkeypatch.setattr("shrunk.client.security.requests.post", lookup)
    monkeypatch.setattr("shrunk.client.links.requests.head", head)
    with dev_login(client, "user"):
        created = create_link(client, "Google failure control", "https://allowed.example.test")
        assert created.status_code == 201
    assert "test-api-key" not in caplog.text
    assert dummy_url not in caplog.text
    assert all(record.exc_info is None for record in caplog.records)
