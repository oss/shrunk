from typing import List

import pytest
from bson.objectid import ObjectId
from werkzeug.test import Client

from util import assert_is_response_valid, dev_login


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
def test_create_access_token_permissions(client: Client, permissions: List[str], expect_pass: bool) -> None:
    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "test123"})
        org_id = resp.json["id"]

        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": permissions,
                "organizationId": org_id,
            },
        )
        if expect_pass:
            assert resp.status_code == 201
        else:
            assert resp.status_code == 400

        resp = client.post(
            "/api/core/org/access_token",
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

        resp = client.post("/api/core/org", json={"name": "test345"})
        invalid_org_id = resp.json["id"]

        # attempt endpoint with missing permissions

        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["read:links", "create:links"],
                "organizationId": org_id,
            },
        )
        token = resp.json["access_token"]

        resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403

        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": [
                    "read:users",
                    "read:organizations",
                    "read:links",
                    "create:links",
                    "read:tracking-pixels",
                    "create:tracking-pixels",
                ],
                "organizationId": org_id,
            },
        )
        token = resp.json["access_token"]
        invalid_token = "9b598e36-839c-4f94-8a72-38892b0d74dc"

        # attempt invalid token
        resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {invalid_token}"})
        assert resp.status_code == 401

        # attempt users with regular access token
        resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403

        # attempt invalid org_id assoicated with token

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

        # create link endpoint
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
        # get link by id endpoint
        resp = client.get(
            f"/api/v1/links/{org_id}/{link_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200
        assert resp.json["_id"] == link_id
        assert resp.json["owner"]["_id"] == org_id

        # get org links endpoint
        resp = client.get(
            f"/api/v1/organizations/{org_id}/links",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        # create tracking pixel endpoint
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

        # get tracking pixel by id endpoint
        resp = client.get(
            f"/api/v1/tracking-pixels/{org_id}/{tp_link_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json["_id"] == tp_link_id
        assert resp.json["owner"]["_id"] == org_id

        # get org tracking pixels endpoint
        resp = client.get(
            f"/api/v1/tracking-pixels/{org_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        # get all organizations
        resp = client.get(
            "/api/v1/organizations",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

        # get all organizations of a user
        resp = client.get(
            "/api/v1/organizations/DEV_ADMIN",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403

        # get qr code of a link
        resp = client.get(
            f"/api/v1/links/{link_id}/qrcode",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        # with super token test endpoints
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": [
                    "read:users",
                    "read:links",
                    "create:links",
                    "read:tracking-pixels",
                    "create:tracking-pixels",
                    "read:organizations",
                    "create:organizations",
                ],
            },
        )
        token = resp.json["access_token"]

        resp = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200

        # create link within organization
        resp = client.post(
            "/api/v1/links",
            json=create_link_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201

        # create link for netid
        create_link_payload = {
            "title": "My API Link",
            "long_url": "https://example.com",
            "owner_netid": "DEV_FACSTAFF",
        }
        resp = client.post(
            "/api/v1/links",
            json=create_link_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201

        # get link
        resp = client.get(
            f"/api/v1/links/{resp.json['id']}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200

        resp = client.get(
            f"/api/v1/organizations/{org_id}/links",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200

        resp = client.get(
            f"/api/v1/links/{org_id}/{link_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200

        resp = client.get(
            f"/api/v1/organizations/{org_id}/links/{link_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200

        resp = client.post(
            "/api/v1/tracking-pixels",
            json=create_tp_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 201

        resp = client.get(
            f"/api/v1/tracking-pixels/{org_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200

        resp = client.get(
            f"/api/v1/tracking-pixels/{org_id}/{tp_link_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200

        resp = client.get(
            "/api/v1/organizations",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        resp = client.get(
            "/api/v1/organizations/DEV_ADMIN",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert all("role" in org for org in resp.json["organizations"])

        resp = client.get(
            f"/api/v1/links/{link_id}/qrcode",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        resp = client.post(
            "/api/v1/organizations",
            json={"name": "testyyyy", "owner_netid": "DEV_ADMIN"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 201


def test_get_user_accessible_links_requires_supertoken(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "test-accessible-links"})
        org_id = resp.json["id"]

        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["read:links"],
                "organizationId": org_id,
            },
        )
        org_token = resp.json["access_token"]

        resp = client.get(
            "/api/v1/users/DEV_ADMIN/links",
            headers={"Authorization": f"Bearer {org_token}"},
        )

        assert resp.status_code == 403
        assert resp.json["error"]["code"] == "INSUFFICIENT_PERMISSIONS"


def test_get_user_accessible_links_requires_read_links_permission(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["read:users"],
            },
        )
        token = resp.json["access_token"]

        resp = client.get(
            "/api/v1/users/DEV_ADMIN/links",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 403


def test_get_user_accessible_links_rejects_invalid_netid(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["read:links"],
            },
        )
        token = resp.json["access_token"]

        resp = client.get(
            "/api/v1/users/not-a-valid-netid/links",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 400
        assert resp.json["error"]["code"] == "INVALID_NETID"


def test_get_user_accessible_links_returns_owned_shared_and_org_links(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "facstaff-org"})
        org_id = resp.json["id"]
        resp = client.put(f"/api/core/org/{org_id}/member/DEV_FACSTAFF")
        assert resp.status_code == 204

        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["read:links", "create:links"],
            },
        )
        token = resp.json["access_token"]

        owned_link_id = str(
            client.application.client.links.create(
                "owned by facstaff",
                "https://example.com/owned-by-facstaff",
                None,
                None,
                {"_id": "DEV_FACSTAFF", "type": "netid"},
                "127.0.0.1",
            )[0]
        )

        org_owned_link_id = str(
            client.application.client.links.create(
                "owned by facstaff org",
                "https://example.com/owned-by-org",
                None,
                None,
                {"_id": ObjectId(org_id), "type": "org"},
                "127.0.0.1",
            )[0]
        )

        direct_shared_id = client.application.client.links.create(
            "direct viewer shared",
            "https://example.com/direct-viewer",
            None,
            None,
            {"_id": "DEV_ADMIN", "type": "netid"},
            "127.0.0.1",
            viewers=[{"_id": "DEV_FACSTAFF", "type": "netid"}],
        )[0]

        org_shared_id = client.application.client.links.create(
            "org editor shared",
            "https://example.com/org-editor",
            None,
            None,
            {"_id": "DEV_ADMIN", "type": "netid"},
            "127.0.0.1",
            editors=[{"_id": org_id, "type": "org"}],
        )[0]

        unrelated_id = client.application.client.links.create(
            "unrelated",
            "https://example.com/unrelated",
            None,
            None,
            {"_id": "DEV_ADMIN", "type": "netid"},
            "127.0.0.1",
        )[0]

        resp = client.get(
            "/api/v1/users/DEV_FACSTAFF/links",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200
        returned_ids = {link["_id"] for link in resp.json["links"]}
        assert owned_link_id in returned_ids
        assert org_owned_link_id in returned_ids
        assert str(direct_shared_id) in returned_ids
        assert str(org_shared_id) in returned_ids
        assert str(unrelated_id) not in returned_ids


def test_get_user_accessible_links_excludes_tracking_pixels_and_deleted_links(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["read:links"],
            },
        )
        token = resp.json["access_token"]

        visible_link_id = client.application.client.links.create(
            "visible link",
            "https://example.com/visible",
            None,
            None,
            {"_id": "DEV_FACSTAFF", "type": "netid"},
            "127.0.0.1",
        )[0]

        tracking_pixel_id = client.application.client.links.create(
            "tracking pixel",
            "https://example.com/tracking",
            None,
            None,
            {"_id": "DEV_FACSTAFF", "type": "netid"},
            "127.0.0.1",
            is_tracking_pixel_link=True,
        )[0]

        deleted_link_id = client.application.client.links.create(
            "deleted link",
            "https://example.com/deleted",
            None,
            None,
            {"_id": "DEV_FACSTAFF", "type": "netid"},
            "127.0.0.1",
        )[0]
        client.application.client.links.delete(deleted_link_id, "DEV_FACSTAFF")

        legacy_link_id = client.application.client.links.db.urls.insert_one(
            {
                "title": "legacy link",
                "alias": "legacy-link",
                "long_url": "https://example.com/legacy",
                "timeCreated": None,
                "visits": 0,
                "unique_visits": 0,
                "deleted": False,
                "creator_ip": "127.0.0.1",
                "expiration_time": None,
                "owner": {"_id": "DEV_FACSTAFF", "type": "netid"},
                "domain": "",
                "viewers": [],
                "editors": [],
            }
        ).inserted_id

        resp = client.get(
            "/api/v1/users/DEV_FACSTAFF/links",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert resp.status_code == 200
        returned_ids = {link["_id"] for link in resp.json["links"]}
        assert str(visible_link_id) in returned_ids
        assert str(legacy_link_id) in returned_ids
        assert str(tracking_pixel_id) not in returned_ids
        assert str(deleted_link_id) not in returned_ids


def test_get_valid_access_permissions(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.get("/api/core/org/valid-permissions")
        assert_is_response_valid(resp)

        assert isinstance(resp.json["permissions"], list)


# ---------------------------------------------------------------------------
# PATCH /api/v1/links/<link_id>  (update link)
# ---------------------------------------------------------------------------


def test_update_link_soft_deletes(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["update:links"],
            },
        )
        token = resp.json["access_token"]

        link_id = str(
            client.application.client.links.create(
                "to be deleted",
                "https://example.com/to-delete",
                None,
                None,
                {"_id": "DEV_ADMIN", "type": "netid"},
                "127.0.0.1",
            )[0]
        )

        resp = client.patch(
            f"/api/v1/links/{link_id}",
            json={"deleted": True},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json["status"] == "updated"

        link = client.application.client.links.db.urls.find_one({"_id": ObjectId(link_id)})
        assert link["deleted"] is True

        # second delete on already-deleted link returns 404
        resp = client.patch(
            f"/api/v1/links/{link_id}",
            json={"deleted": True},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404


def test_update_link_requires_supertoken(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post("/api/core/org", json={"name": "patch-link-org-test"})
        org_id = resp.json["id"]

        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["update:links"],
                "organizationId": org_id,
            },
        )
        org_token = resp.json["access_token"]

        link_id = str(
            client.application.client.links.create(
                "test link",
                "https://example.com/patch-test",
                None,
                None,
                {"_id": "DEV_ADMIN", "type": "netid"},
                "127.0.0.1",
            )[0]
        )

        resp = client.patch(
            f"/api/v1/links/{link_id}",
            json={"deleted": False},
            headers={"Authorization": f"Bearer {org_token}"},
        )
        assert resp.status_code == 403
        assert resp.json["error"]["code"] == "INSUFFICIENT_PERMISSIONS"


def test_update_link_returns_404_for_nonexistent(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["update:links"],
            },
        )
        token = resp.json["access_token"]

        fake_id = str(ObjectId())
        resp = client.patch(
            f"/api/v1/links/{fake_id}",
            json={"deleted": False},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404
        assert resp.json["error"]["code"] == "NO_SUCH_OBJECT"


def test_update_link_restore_soft_deleted(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["update:links", "read:links"],
            },
        )
        token = resp.json["access_token"]

        link_id = str(
            client.application.client.links.create(
                "restorable link",
                "https://example.com/restore-me",
                None,
                None,
                {"_id": "DEV_ADMIN", "type": "netid"},
                "127.0.0.1",
            )[0]
        )

        # soft-delete via PATCH
        resp = client.patch(
            f"/api/v1/links/{link_id}",
            json={"deleted": True},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        # confirm deleted
        link = client.application.client.links.db.urls.find_one({"_id": ObjectId(link_id)})
        assert link["deleted"] is True

        # restore via PATCH
        resp = client.patch(
            f"/api/v1/links/{link_id}",
            json={"deleted": False},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json["status"] == "updated"

        link = client.application.client.links.db.urls.find_one({"_id": ObjectId(link_id)})
        assert link["deleted"] is False
        assert link.get("deleted_by") is None
        assert link.get("deleted_time") is None


def test_update_link_update_expiration_time(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["update:links"],
            },
        )
        token = resp.json["access_token"]

        link_id = str(
            client.application.client.links.create(
                "expiry link",
                "https://example.com/expiry",
                None,
                None,
                {"_id": "DEV_ADMIN", "type": "netid"},
                "127.0.0.1",
            )[0]
        )

        resp = client.patch(
            f"/api/v1/links/{link_id}",
            json={"expiration_time": "2099-01-01T00:00:00Z"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        link = client.application.client.links.db.urls.find_one({"_id": ObjectId(link_id)})
        assert link["expiration_time"] is not None

        # remove expiration
        resp = client.patch(
            f"/api/v1/links/{link_id}",
            json={"expiration_time": None},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200

        link = client.application.client.links.db.urls.find_one({"_id": ObjectId(link_id)})
        assert link.get("expiration_time") is None


def test_update_link_rejects_unknown_fields(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["update:links"],
            },
        )
        token = resp.json["access_token"]

        link_id = str(
            client.application.client.links.create(
                "test link",
                "https://example.com/unknown-fields",
                None,
                None,
                {"_id": "DEV_ADMIN", "type": "netid"},
                "127.0.0.1",
            )[0]
        )

        resp = client.patch(
            f"/api/v1/links/{link_id}",
            json={"long_url": "https://evil.com"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# who- org filtering in GET /api/v1/organizations
# ---------------------------------------------------------------------------


def test_get_organizations_excludes_who_orgs(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["read:organizations", "create:organizations"],
            },
        )
        token = resp.json["access_token"]

        # Create a normal org and a who- org directly in DB
        client.application.client.orgs.create("normal-org-visible")
        client.application.client.orgs.create("who-netid123")

        resp = client.get(
            "/api/v1/organizations",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        names = [o["name"] for o in resp.json["organizations"]]
        assert "normal-org-visible" in names
        assert "who-netid123" not in names


# ---------------------------------------------------------------------------
# who- link filtering in GET /api/v1/users/<netid>/links
# ---------------------------------------------------------------------------


def test_get_user_accessible_links_excludes_who_links(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["read:links"],
            },
        )
        token = resp.json["access_token"]

        normal_link_id = str(
            client.application.client.links.create(
                "normal link",
                "https://example.com/normal",
                None,
                None,
                {"_id": "DEV_FACSTAFF", "type": "netid"},
                "127.0.0.1",
            )[0]
        )

        who_link_id = client.application.client.links.db.urls.insert_one(
            {
                "title": "who link",
                "alias": "who-abc123",
                "long_url": "https://example.com/who",
                "timeCreated": None,
                "visits": 0,
                "unique_visits": 0,
                "deleted": False,
                "creator_ip": "127.0.0.1",
                "expiration_time": None,
                "owner": {"_id": "DEV_FACSTAFF", "type": "netid"},
                "domain": "",
                "viewers": [],
                "editors": [],
            }
        ).inserted_id

        resp = client.get(
            "/api/v1/users/DEV_FACSTAFF/links",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        returned_ids = {link["_id"] for link in resp.json["links"]}
        assert normal_link_id in returned_ids
        assert str(who_link_id) not in returned_ids


# ---------------------------------------------------------------------------
# Session API who- link guards (link.py)
# ---------------------------------------------------------------------------


def test_session_patch_who_link_blocked_for_non_admin(client: Client) -> None:
    with dev_login(client, "facstaff"):
        who_link_id = client.application.client.links.db.urls.insert_one(
            {
                "title": "who link",
                "alias": "who-session-patch",
                "long_url": "https://example.com/original",
                "timeCreated": None,
                "visits": 0,
                "unique_visits": 0,
                "deleted": False,
                "creator_ip": "127.0.0.1",
                "expiration_time": None,
                "owner": {"_id": "DEV_FACSTAFF", "type": "netid"},
                "domain": "",
                "viewers": [],
                "editors": [],
            }
        ).inserted_id

        resp = client.patch(
            f"/api/core/link/{who_link_id}",
            json={"title": "hacked"},
        )
        assert resp.status_code == 403


def test_session_delete_who_link_blocked_for_non_admin(client: Client) -> None:
    with dev_login(client, "facstaff"):
        who_link_id = client.application.client.links.db.urls.insert_one(
            {
                "title": "who link",
                "alias": "who-session-delete",
                "long_url": "https://example.com/original",
                "timeCreated": None,
                "visits": 0,
                "unique_visits": 0,
                "deleted": False,
                "creator_ip": "127.0.0.1",
                "expiration_time": None,
                "owner": {"_id": "DEV_FACSTAFF", "type": "netid"},
                "domain": "",
                "viewers": [],
                "editors": [],
            }
        ).inserted_id

        resp = client.delete(f"/api/core/link/{who_link_id}")
        assert resp.status_code == 403


def test_org_search_excludes_who_orgs(client: Client) -> None:
    with dev_login(client, "admin"):
        client.application.client.orgs.create("who-test-personal")
        client.application.client.orgs.create("visible-org")

        resp = client.post(
            "/api/core/search/org",
            json={
                "query": "",
                "show_all": True,
                "filter_deleted": False,
                "sort": {"key": "name", "order": "ascending"},
                "pagination": {"skip": 0, "limit": 50},
            },
        )
        assert resp.status_code == 200
        names = [o["name"] for o in resp.json["results"]]
        assert "visible-org" in names
        assert "who-test-personal" not in names


def test_update_link_invalid_expiration_returns_400(client: Client) -> None:
    with dev_login(client, "admin"):
        resp = client.post(
            "/api/core/org/access_token",
            json={
                "title": "title",
                "description": "description",
                "permissions": ["update:links"],
            },
        )
        token = resp.json["access_token"]

        link_id = str(
            client.application.client.links.create(
                "expiry test",
                "https://example.com/expiry",
                None,
                None,
                {"_id": "DEV_ADMIN", "type": "netid"},
                "127.0.0.1",
            )[0]
        )

        resp = client.patch(
            f"/api/v1/links/{link_id}",
            json={"expiration_time": "not-a-valid-date"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 400
        assert resp.json["error"]["code"] == "INVALID_EXPIRATION_TIME"


def test_session_patch_who_link_allowed_for_admin(client: Client) -> None:
    with dev_login(client, "admin"):
        who_link_id = client.application.client.links.db.urls.insert_one(
            {
                "title": "who link",
                "alias": "who-admin-patch",
                "long_url": "https://example.com/original",
                "timeCreated": None,
                "visits": 0,
                "unique_visits": 0,
                "deleted": False,
                "creator_ip": "127.0.0.1",
                "expiration_time": None,
                "owner": {"_id": "DEV_ADMIN", "type": "netid"},
                "domain": "",
                "viewers": [],
                "editors": [],
            }
        ).inserted_id

        resp = client.patch(
            f"/api/core/link/{who_link_id}",
            json={"title": "admin updated"},
        )
        assert resp.status_code == 204
