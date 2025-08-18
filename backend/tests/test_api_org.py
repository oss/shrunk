from werkzeug.test import Client
from util import dev_login, assert_is_response_valid
from typing import List
import pytest


def test_rename_org(client: Client) -> None:
    """Tests that an org can successfully be renamed."""
    with dev_login(client, "admin"):
        # Create an org
        resp = client.post("/api/core/org", json={"name": "testorg12"})
        org_id = resp.json["id"]
        assert 200 <= resp.status_code <= 300

        # Create the second test org
        resp = client.post("api/core/org", json={"name": "renameorgtest"})
        org_rename_test_id = resp.json["id"]
        org_rename_test_name = resp.json["name"]
        assert 200 <= resp.status_code <= 300

        new_name = "testorgkevinwashere"

        # Test that user can successful rename the org
        client.put(f"/api/core/org/{org_id}/rename/{new_name}")
        assert 200 <= resp.status_code <= 300

        # Get the org name of org_id and check if it has changed
        resp = client.get(f"/api/core/org/{org_id}")
        assert 200 <= resp.status_code <= 300
        assert resp.json["name"] == new_name

        # Check that we cannot rename the org to an org that already exists
        resp = client.put(
            f"/api/core/org/{org_rename_test_id}/rename/{org_rename_test_name}"
        )
        assert resp.status_code == 403

        # Test that renaming an org that doesn't exist won't work
        resp = client.put(
            f"/api/core/org/THISORGDOESN'TEXIST/rename/{org_rename_test_id}"
        )
        assert resp.status_code == 404


def test_rename_org_permissions(client: Client) -> None:
    """Tests that a user cannot rename an org if they are not an admin"""
    with dev_login(client, "admin"):
        # Create an org
        resp = client.post("/api/core/org", json={"name": "testorg12"})
        assert 200 <= resp.status_code <= 300
        org_id = resp.json["id"]

    with dev_login(client, "user"):
        # Check that can't rename the org
        resp = client.put(f"/api/core/org/{org_id}/rename/kevinwasheretestrename")
        assert resp.status_code == 403


def test_restrict_last_admin_demotion(client: Client) -> None:
    """Tests that the last admin of an org cannot be demoted."""
    with dev_login(client, "admin"):
        # Create an org. By default the creator is an admin of the org
        resp = client.post("/api/core/org", json={"name": "test123"})
        assert 200 <= resp.status_code <= 300
        org_id = resp.json["id"]

        resp = client.put(f"/api/core/org/{org_id}/member/DEV_TEST")
        assert resp.status_code == 204

        resp = client.patch(
            f"/api/core/org/{org_id}/member/DEV_TEST", json={"is_admin": True}
        )
        assert resp.status_code == 204

        resp = client.delete(f"/api/core/org/{org_id}/member/DEV_TEST")
        assert resp.status_code == 204

        # Attempt to demote the last admin
        resp = client.patch(
            f"/api/core/org/{org_id}/member/DEV_ADMIN", json={"is_admin": False}
        )
        assert resp.status_code == 400


@pytest.mark.parametrize(
    ("permissions", "expect_pass"),
    [
        (
            [
                "read:users",
                "read:links",
                "create:links",
                "read:tracking-pixels",
                "create:tracking-pixels",
            ],
            True,
        ),
        (["read:links", "create:links"], True),
        (["nonexist"], False),
        (["read:links", "nonexist"], False),
        (["nonexist", "read:links"], False),
        ([], False),
    ],
)
def test_create_access_token_permissions(
    client: Client, permissions: List[str], expect_pass: bool
) -> None:
    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "test123"})
        org_id = resp.json["id"]

        resp = client.post(
            f"/api/core/org/{org_id}/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": permissions,
            },
        )
        if expect_pass:
            assert resp.status_code == 201
        else:
            assert resp.status_code == 400


def test_external_api_endpoints(client: Client) -> None:
    with dev_login(client, "admin"):

        resp = client.post("/api/core/org", json={"name": "test123"})
        org_id = resp.json["id"]

        #attempt endpoint with missing permissions

        resp = client.post(
            f"/api/core/org/{org_id}/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": [
                    "read:links",
                    "create:links"
                ],
            },
        )
        token = resp.json["access_token"]

        resp = client.get(
            "/api/v1/users", headers={"Authorization": f"Bearer {token}"}
        )
        assert resp.status_code == 403

        resp = client.post(
            f"/api/core/org/{org_id}/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": [
                    "read:users",
                    "read:links",
                    "create:links",
                    "read:tracking-pixels",
                    "create:tracking-pixels",
                ],
            },
        )
        token = resp.json["access_token"]
        invalid_token = "9b598e36-839c-4f94-8a72-38892b0d74dc"
        invalid_org_id = "68a2815eabba3cb0f5b85ceb"

        #attempt invalid token
        resp = client.get(
            "/api/v1/users", headers={"Authorization": f"Bearer {invalid_token}"}
        )
        assert resp.status_code == 401

        #users endpoint
        resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200

        #attempt invalid org_id assoicated with token

        create_link_payload_invalid = {
            "title": "My API Link",
            "long_url": "https://example.com",
            "organization_id": invalid_org_id,
        }

        resp = client.post(
            "/api/v1/links",
            json=create_link_payload_invalid,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

        #create link endpoint
        create_link_payload = {
            "title": "My API Link",
            "long_url": "https://example.com",
            "organization_id": org_id,
        }

        resp = client.post(
            "/api/v1/links",
            json=create_link_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        link_id = resp.json["id"]
        #get link by id endpoint
        resp = client.get(
            f"/api/v1/links/{org_id}/{link_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200
        assert resp.json["_id"] == link_id
        assert resp.json["owner"]["_id"] == org_id

        #get org links endpoint
        resp = client.get(
            f"/api/v1/links/{org_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        #create tracking pixel endpoint
        create_tp_payload = {
            "title": "My Tracking Pixel",
            "organization_id": org_id,
        }
        resp = client.post(
            "/api/v1/tracking-pixels",
            json=create_tp_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201
        tp_link_id = resp.json["id"]

        #get tracking pixel by id endpoint
        resp = client.get(
            f"/api/v1/tracking-pixels/{org_id}/{tp_link_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json["_id"] == tp_link_id
        assert resp.json["owner"]["_id"] == org_id

        #get org tracking pixels endpoint
        resp = client.get(
            f"/api/v1/tracking-pixels/{org_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200


def test_get_valid_access_permissions(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.get("/api/core/org/valid-permissions")
        assert_is_response_valid(resp)

        assert type(resp.json["permissions"]) is list


def test_org_get_link_permissions(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "testorg12"})
        assert 200 <= resp.status_code <= 300
        org_id = resp.json["id"]
        resp = client.get("/api/core/org/random/links")
        assert resp.status_code == 404

        resp = client.get("/api/core/org/689540400d104ea00674e39a/links")
        assert resp.status_code == 404

        resp = client.get(f"/api/core/org/{org_id}/links")
        assert resp.status_code == 200
    with dev_login(client, "user"):
        resp = client.get(f"/api/core/org/{org_id}/links")
        assert resp.status_code == 403
