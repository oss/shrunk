import base64

import pytest
from werkzeug.test import Client

from util import dev_login


def test_get_roles(client: Client) -> None:
    with dev_login(client, 'admin'):
        resp = client.get('/api/v1/role')
        assert resp.status_code == 200
        assert 'roles' in resp.json
        assert isinstance(resp.json['roles'], list)


def test_get_roles_unauthorized(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.get('/api/v1/role')
        assert resp.status_code == 403


@pytest.mark.parametrize(('user', 'role', 'expected'), [
    ('admin', 'blacklisted', True),
    ('facstaff', 'blacklisted', False),
    ('admin', 'whitelisted', True),
    ('facstaff', 'whitelisted', True),
    ('user', 'whitelisted', False),
])
def test_get_role_text(client: Client, user: str, role: str, expected: bool) -> None:
    with dev_login(client, user):
        resp = client.get(f'/api/v1/role/{role}/text')

        if expected:
            assert resp.status_code == 200
            assert 'text' in resp.json
            assert isinstance(resp.json['text'], dict)
        else:
            assert resp.status_code == 403


@pytest.mark.parametrize(('user', 'role', 'expected'), [
    ('admin', 'blacklisted', True),
    ('facstaff', 'whitelisted', True),
    ('user', 'whitelisted', False),
    ('facstaff', 'blacklisted', False),
])
def test_get_role_entities(client: Client, user: str, role: str, expected: bool) -> None:
    with dev_login(client, user):
        resp = client.get(f'/api/v1/role/{role}/entity')

        if expected:
            assert resp.status_code == 200
            assert 'entities' in resp.json
            assert isinstance(resp.json['entities'], list)
        else:
            assert resp.status_code == 403


@pytest.mark.parametrize(('role', 'entity', 'expected'), [
    ('whitelisted', 'DEV_ADMIN', True),
    ('blocked_url', 'https://google.com/something', True),
    ('blocked_url', '!!$*#$*#(*#', False),
])
def test_validate_entity(client: Client, role: str, entity: str, expected: bool) -> None:
    entity_b32 = str(base64.b32encode(bytes(entity, 'utf8')), 'utf8')

    with dev_login(client, 'admin'):
        resp = client.get(f'/api/v1/role/{role}/validate_entity/{entity_b32}')
        assert resp.status_code == 200
        assert resp.json['valid'] is expected


@pytest.mark.parametrize(('user', 'role'), [
    ('facstaff', 'blacklisted'),
    ('user', 'whitelisted'),
])
def test_validate_entity_unauthorized(client: Client, user: str, role: str) -> None:
    entity = 'entity'
    entity_b32 = str(base64.b32encode(bytes(entity, 'utf8')), 'utf8')

    with dev_login(client, user):
        resp = client.get(f'/api/v1/role/{role}/validate_entity/{entity_b32}')
        assert resp.status_code == 403


@pytest.mark.parametrize(('user', 'role', 'entity'), [
    ('admin', 'blacklisted', 'DEV_USER'),
    ('facstaff', 'whitelisted', 'DEV_PWR_USER'),
])
def test_grant_revoke_role(client: Client, user: str, role: str, entity: str) -> None:
    entity_b32 = str(base64.b32encode(bytes(entity, 'utf8')), 'utf8')

    with dev_login(client, user):
        # Grant the role to the entity
        resp = client.put(f'/api/v1/role/{role}/entity/{entity_b32}', json={})
        assert resp.status_code == 204

        # Check that the entity has the role
        resp = client.get(f'/api/v1/role/{role}/entity')
        assert resp.status_code == 200
        assert any(ent['entity'] == entity for ent in resp.json['entities'])

        # Revoke the role from the entity
        resp = client.delete(f'/api/v1/role/{role}/entity/{entity_b32}')
        assert resp.status_code == 204

        # Check that the entity no longer has the role
        resp = client.get(f'/api/v1/role/{role}/entity')
        assert resp.status_code == 200
        assert not any(ent['entity'] == entity for ent in resp.json['entities'])


@pytest.mark.parametrize(('user', 'role', 'entity'), [
    ('facstaff', 'blacklisted', 'DEV_USER'),
    ('user', 'whitelisted', 'DEV_FACSTAFF'),
])
def test_grant_revoke_role_unauthorized(client: Client, user: str, role: str, entity: str) -> None:
    entity_b32 = str(base64.b32encode(bytes(entity, 'utf8')), 'utf8')

    with dev_login(client, user):
        # Check that we cannot grant the role
        resp = client.put(f'/api/v1/role/{role}/entity/{entity_b32}', json={})
        assert resp.status_code == 403

        # Check that we cannot revoke the role
        resp = client.delete(f'/api/v1/role/{role}/entity/{entity_b32}')
        assert resp.status_code == 403
