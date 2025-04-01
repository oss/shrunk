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

        # Attempt to demote the last admin
        resp = client.patch(
            f"/api/core/org/{org_id}/member/DEV_ADMIN", json={"is_admin": False}
        )
        assert resp.status_code == 400


@pytest.mark.parametrize(
    ("permissions", "expect_pass"),
    [
        (["read:links"], True),
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
    with dev_login(client, "power"):
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


def test_get_valid_access_permissions(client: Client) -> None:
    with dev_login(client, "power"):
        resp = client.post("/api/core/org/valid-permissions")
        assert_is_response_valid(resp)

        assert type(resp["permissions"]) is list
