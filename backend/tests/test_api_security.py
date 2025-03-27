import base64
import pytest
from werkzeug.test import Client
from util import dev_login, create_link


def test_security_risk_client_method(client: Client) -> None:
    unsafe_link = "http://malware.testing.google.test/testing/malware/*"
    unsafe_link_b32 = str(base64.b32encode(bytes(unsafe_link, "utf8")), "utf8")

    regular_link = "https://google.com/"
    regular_link_b32 = str(base64.b32encode(bytes(regular_link, "utf8")), "utf8")

    with dev_login(client, "admin"):
        # Create a link and get its message
        resp = client.get(f"/api/v1/security/security_test/{unsafe_link_b32}")
        assert resp.status_code == 200
        assert resp.json["detected"]

        # Creating a link with a regular link should not be forbidden
        resp = client.get(f"/api/v1/security/security_test/{regular_link_b32}")
        assert resp.status_code == 200
        assert not resp.json["detected"]

    with dev_login(client, "user"):
        # A user that is not an admin cannot use the security_test endpoint
        resp = client.get(f"/api/v1/security/security_test/{unsafe_link_b32}")
        assert resp.status_code == 403


@pytest.mark.parametrize(("permission"), ["user", "facstaff", "power"])
def test_user_and_admin_security_link_abilities(
    client: Client, permission: str
) -> None:
    unsafe_link = "http://malware.testing.google.test/testing/malware/*"
    unsafe_link_title = "first unsafe link"
    regular_link = "https://google.com"

    with dev_login(client, permission):
        # a user tries to shrink a link detected to be unsafe
        # this could be any user (admin, facstaff)
        resp = client.post(
            "/api/v1/link",
            json={"description": unsafe_link_title, "long_url": unsafe_link},
        )

        # this is a forbidden action. the link will then
        # become a pending link in the unsafe_links collection
        assert resp.status_code == 403
        with pytest.raises(KeyError) as err:
            link_id = resp.json["id"]

    with dev_login(client, "admin"):
        resp = client.post(
            "/api/v1/link",
            json={"description": unsafe_link_title, "long_url": unsafe_link},
        )

        # an admin cannot accidentally post an unsafe link
        # without first explicitly stating to bypass security
        assert resp.status_code == 403

        # when an admin specifies that a regular link should bypass
        # security, go through with the request
        resp = client.post(
            "/api/v1/link",
            json={
                "description": unsafe_link_title,
                "long_url": regular_link,
                "bypass_security_measures": True,
            },
        )
        assert resp.status_code == 201
        link_id = resp.json["id"]

        # test that the link was made successfully after forcing bypass
        resp = client.get(f"/api/v1/link/{link_id}")
        assert resp.status_code == 200
        assert resp.json["description"] == unsafe_link_title


@pytest.mark.parametrize(("permission"), ["user", "facstaff", "power"])
def test_security_api_permissions(client: Client, permission: str) -> None:
    with dev_login(client, permission):
        resp = client.get("/api/v1/security/pending_links")

        # regular users cannot fetch pending list
        assert resp.status_code == 403
        with pytest.raises(TypeError):
            assert resp.json["pendingLinks"]

        # we post a random link so that we have an
        # objectID to work with. it does not matter what it is,
        # we just need an objectID to work with in order to call endpoints
        random_link = "http://google.com"
        resp = client.post(
            "/api/v1/link", json={"description": "random", "long_url": random_link}
        )
        link_id = resp.json["id"]

        resp = client.patch(f"/api/v1/security/promote/{link_id}")
        assert resp.status_code == 403
        resp = client.get(f"/api/v1/security/status/{link_id}")
        assert resp.status_code == 403
        resp = client.patch(f"/api/v1/security/reject/{link_id}")
        assert resp.status_code == 403
        resp = client.patch(f"/api/v1/security/toggle")
        assert resp.status_code == 403
        resp = client.get(f"/api/v1/security/status")
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
        resp = client.get("/api/v1/security/pending_links")
        assert resp.status_code == 200
        assert resp.json["pendingLinks"]
        assert len(resp.json["pendingLinks"]) == 2

        # check that unsafe link document is correct
        unsafe_link_document = resp.json["pendingLinks"][0]
        unsafe_link_id = unsafe_link_document["_id"]
        assert unsafe_link_document["description"] == "first unsafe link"
        assert unsafe_link_document["long_url"] == unsafe_link

        # check that second unsafe link document is correct
        second_unsafe_link_document = resp.json["pendingLinks"][1]
        second_unsafe_link_id = second_unsafe_link_document["_id"]
        assert second_unsafe_link_document["description"] == "second unsafe link"
        assert second_unsafe_link_document["long_url"] == second_unsafe_link

        # check that default status is pending for both unsafe links
        resp = client.get(f"/api/v1/security/status/{unsafe_link_id}")
        assert resp.status_code == 200
        assert resp.json["status"] == "pending"
        resp = client.get(f"/api/v1/security/status/{second_unsafe_link_id}")
        assert resp.status_code == 200
        assert resp.json["status"] == "pending"

        # test that the link hasn't made through as a regular link
        # via a call to the link API
        resp = client.get(f"/api/v1/link/{unsafe_link_id}")
        assert resp.status_code == 404

        # check that pending link status promotion works
        resp = client.patch(f"/api/v1/security/promote/{unsafe_link_id}")
        assert resp.status_code == 200
        resp = client.get(f"/api/v1/security/status/{unsafe_link_id}")
        assert resp.status_code == 200
        assert resp.json["status"] == "approved"

        # promoted unsafe link cannot be rejected
        resp = client.patch(f"/api/v1/security/reject/{unsafe_link_id}")
        assert resp.status_code == 409

        # =======================Second Unsafe Link==================

        # test rejection of a pending link
        resp = client.patch(f"/api/v1/security/reject/{second_unsafe_link_id}")
        assert resp.status_code == 200
        resp = client.get(f"/api/v1/security/status/{second_unsafe_link_id}")
        assert resp.status_code == 200
        assert resp.json["status"] == "denied"
        resp = client.get(f"/api/v1/link/{second_unsafe_link_id}")
        assert resp.status_code == 404


def test_toggle_security(client: Client) -> None:
    unsafe_link = "http://malware.testing.google.test/testing/malware/*"
    unsafe_link_title = "unsafe link"

    with dev_login(client, "admin"):
        # we can get the status of security measures
        resp = client.get("/api/v1/security/status")
        assert resp.status_code == 200
        assert resp.get_data(as_text=True) == "ON"

        # toggling security measures works
        resp = client.patch("/api/v1/security/toggle")
        assert resp.status_code == 200
        resp = client.get("/api/v1/security/status")
        assert resp.status_code == 200
        assert resp.get_data(as_text=True) != "ON"

    with dev_login(client, "user"):
        # when security measures are off, users can post unsafe links
        resp = client.post(
            "/api/v1/link",
            json={"description": unsafe_link_title, "long_url": unsafe_link},
        )
        assert resp.status_code == 201

    with dev_login(client, "admin"):
        resp = client.patch("/api/v1/security/toggle")
        assert resp.status_code == 200

        resp = client.get("/api/v1/security/status")
        assert resp.status_code == 200
        assert resp.get_data(as_text=True) == "ON"

    with dev_login(client, "user"):
        # when security measures are toggled on, users cannot post unsafe links
        resp = client.post(
            "/api/v1/link",
            json={
                "description": "IM GOING TO HACK RUTGERS LMAO !!!!!!!!! WOOOOOOo",
                "long_url": unsafe_link,
            },
        )
        assert resp.status_code == 403
