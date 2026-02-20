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
def test_get_role_entities(
    client: Client, user: str, role: str, expected: bool
) -> None:
    with dev_login(client, user):
        resp = client.get(f"/api/core/role/{role}/entity")

        if expected:
            assert resp.status_code == 200
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
def test_validate_entity(
    client: Client, role: str, entity: str, expected: bool
) -> None:
    entity_b32 = str(base64.b32encode(bytes(entity, "utf8")), "utf8")

    with dev_login(client, "admin"):
        resp = client.get(f"/api/core/role/{role}/validate_entity/{entity_b32}")
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
