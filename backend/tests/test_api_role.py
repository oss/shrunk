import base64

import pytest
from werkzeug.test import Client

from util import dev_login


@pytest.mark.parametrize(
    ("user", "role", "expected"),
    [
        ("admin", "blacklisted", True),
        ("facstaff", "whitelisted", True),
        ("user", "whitelisted", False),
        ("facstaff", "blacklisted", False),
    ],
)
def test_get_role_entities(client: Client, user: str, role: str, expected: bool) -> None:
    with dev_login(client, user):
        resp = client.get(f"/api/core/role/{role}/entity")

        if expected:
            assert resp.status_code == 200
            assert resp.json is not None
            assert "entities" in resp.json
            assert isinstance(resp.json["entities"], list)
        else:
            assert resp.status_code == 403


@pytest.mark.parametrize(
    ("role", "entity", "expected"),
    [
        ("whitelisted", "DEV_ADMIN", True),
        ("blocked_url", "https://google.com/something", True),
        ("blocked_url", "!!$*#$*#(*#", False),
    ],
)
def test_validate_entity(client: Client, role: str, entity: str, expected: bool) -> None:
    entity_b32 = str(base64.b32encode(bytes(entity, "utf8")), "utf8")

    with dev_login(client, "admin"):
        resp = client.get(f"/api/core/role/{role}/validate_entity/{entity_b32}")
        assert resp.json is not None
        assert resp.status_code == 200
        assert resp.json["valid"] is expected


@pytest.mark.parametrize(
    ("user", "role"),
    [
        ("facstaff", "blacklisted"),
        ("user", "whitelisted"),
    ],
)
def test_validate_entity_unauthorized(client: Client, user: str, role: str) -> None:
    entity = "entity"
    entity_b32 = str(base64.b32encode(bytes(entity, "utf8")), "utf8")

    with dev_login(client, user):
        resp = client.get(f"/api/core/role/{role}/validate_entity/{entity_b32}")
        assert resp.status_code == 403


@pytest.mark.parametrize("url", ["https://[broken", "https://example.test\uff0fother.test"])
def test_blocked_role_rejects_unparseable_authority_without_partial_grant(client: Client, url: str) -> None:
    encoded = base64.b32encode(url.encode()).decode()
    with dev_login(client, "admin"):
        before = client.get("/api/core/role/blocked_url/entity")
        assert before.status_code == 200
        validated = client.get(f"/api/core/role/blocked_url/validate_entity/{encoded}")
        assert validated.status_code == 200
        assert validated.json is not None
        rejected = client.put(f"/api/core/role/blocked_url/entity/{encoded}", json={})
        assert client.get("/api/core/role/blocked_url/entity").json == before.json
        assert validated.json["valid"] is False
        assert rejected.status_code == 400
