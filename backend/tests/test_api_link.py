import time
import base64
from datetime import datetime, timezone, timedelta

import pytest
from werkzeug.test import Client

from util import dev_login


def test_link(client: Client) -> None:  # pylint: disable=too-many-statements
    """This test simulates the process of creating a link, adding two random aliases
    to it, deleting an alias, and then deleting the link."""

    with dev_login(client, 'user'):
        # Create a link and get its ID
        resp = client.post('/api/v1/link', json={
            'title': 'title',
            'long_url': 'https://example.com',
        })
        assert 200 <= resp.status_code < 300
        link_id = resp.json['id']

        # Add an alias
        resp = client.post(f'/api/v1/link/{link_id}/alias', json={
            'description': 'alias0',
        })
        assert 200 <= resp.status_code < 300
        alias0 = resp.json['alias']

        # Add a second alias
        resp = client.post(f'/api/v1/link/{link_id}/alias', json={
            'description': 'alias1',
        })
        assert 200 <= resp.status_code < 300
        alias1 = resp.json['alias']

        # We shouldn't be allowed to add a custom alias
        resp = client.post(f'/api/v1/link/{link_id}/alias', json={
            'alias': 'abcdefg',
            'description': 'alias2',
        })
        assert 400 <= resp.status_code < 500

        # Get the link info back and make sure it's correct
        resp = client.get(f'/api/v1/link/{link_id}')
        assert 200 <= resp.status_code < 300
        assert resp.json['title'] == 'title'
        assert resp.json['long_url'] == 'https://example.com'
        assert len(resp.json['aliases']) == 2
        for alias in resp.json['aliases']:
            assert alias['alias'] in {alias0, alias1}
            if alias['alias'] == alias0:
                assert alias['description'] == 'alias0'
            elif alias['alias'] == alias1:
                assert alias['description'] == 'alias1'

        # Check that alias0 redirects correctly
        resp = client.get(f'/{alias0}')
        assert resp.status_code == 302
        assert resp.headers['Location'] == 'https://example.com'

        # Check that alias1 redirects correctly
        resp = client.get(f'/{alias1}')
        assert resp.status_code == 302
        assert resp.headers['Location'] == 'https://example.com'

        # Delete alias0
        resp = client.delete(f'/api/v1/link/{link_id}/alias/{alias0}')
        assert 200 <= resp.status_code < 300

        # Check that alias0 no longer redirects
        resp = client.get(f'/{alias0}')
        assert resp.status_code == 404

        # Check that alias1 still redirects
        resp = client.get(f'/{alias1}')
        assert resp.status_code == 302
        assert resp.headers['Location'] == 'https://example.com'

        # Set the link to expire 100 ms in the future
        expiration_time = datetime.now(timezone.utc) + timedelta(milliseconds=100)
        resp = client.patch(f'/api/v1/link/{link_id}', json={
            'expiration_time': expiration_time.isoformat(),
        })
        assert resp.status_code == 204

        # Wait 200 ms
        time.sleep(0.2)

        # Check that alias0 does not redirect
        resp = client.get(f'/{alias0}')
        assert resp.status_code == 404

        # Check that alias1 does not redirect
        resp = client.get(f'/{alias1}')
        assert resp.status_code == 404

        # Unset the link expiration time
        resp = client.patch(f'/api/v1/link/{link_id}', json={
            'expiration_time': None,
        })
        assert resp.status_code == 204

        # Check that alias0 does not redirect (still deleted)
        resp = client.get(f'/{alias0}')
        assert resp.status_code == 404

        # Check that alias1 redirects (no longer expired)
        resp = client.get(f'/{alias1}')
        assert resp.status_code == 302
        assert resp.headers['Location'] == 'https://example.com'

        # Delete the link
        resp = client.delete(f'/api/v1/link/{link_id}')
        assert 200 <= resp.status_code < 300

        # Check that attempting to get the link info now results in a 404 error
        resp = client.get(f'/api/v1/link/{link_id}')
        assert resp.status_code == 404

        # Check that alias0 still doesn't redirect
        resp = client.get(f'/{alias0}')
        assert resp.status_code == 404

        # Check that alias1 doesn't redirect
        resp = client.get(f'/{alias1}')
        assert resp.status_code == 404


def test_create_link_expiration(client: Client) -> None:
    """Test that we can create a link with an expiration time."""

    with dev_login(client, 'admin'):
        # Create a link that expires 100 ms in the future
        expiration_time = datetime.now(timezone.utc) + timedelta(milliseconds=250)
        resp = client.post('/api/v1/link', json={
            'title': 'title',
            'long_url': 'https://example.com',
            'expiration_time': expiration_time.isoformat(),
        })
        assert resp.status_code == 200
        link_id = resp.json['id']

        # Create a random alias
        resp = client.post(f'/api/v1/link/{link_id}/alias', json={
            'description': 'alias0',
        })
        assert resp.status_code == 200
        alias0 = resp.json['alias']

        # Check that alias0 redirects correctly
        resp = client.get(f'/{alias0}')
        assert resp.status_code == 302
        assert resp.headers['Location'] == 'https://example.com'

        # Sleep 500 ms
        time.sleep(0.5)

        # Check that alias0 no longer exists
        resp = client.get(f'/{alias0}')
        assert resp.status_code == 404

        # Unset the link expiration time
        resp = client.patch(f'/api/v1/link/{link_id}', json={
            'expiration_time': None,
        })
        assert resp.status_code == 204

        # Check that alias0 redirects correctly
        resp = client.get(f'/{alias0}')
        assert resp.status_code == 302
        assert resp.headers['Location'] == 'https://example.com'


def test_create_link_bad_long_url(client: Client) -> None:
    """Test that we cannot create a link with a banned long url."""

    long_url = 'https://example.com'
    long_url_b32 = str(base64.b32encode(bytes(long_url, 'utf8')), 'utf8')

    with dev_login(client, 'admin'):
        resp = client.put(f'/api/v1/role/blocked_url/entity/{long_url_b32}', json={})
        assert resp.status_code == 204

    with dev_login(client, 'user'):
        resp = client.post('/api/v1/link', json={
            'title': 'title',
            'long_url': long_url,
        })
        assert resp.status_code == 400


def test_modify_link_bad_long_url(client: Client) -> None:
    long_url = 'https://example.com'
    long_url_b32 = str(base64.b32encode(bytes(long_url, 'utf8')), 'utf8')

    with dev_login(client, 'admin'):
        resp = client.put(f'/api/v1/role/blocked_url/entity/{long_url_b32}', json={})
        assert resp.status_code == 204

    with dev_login(client, 'user'):
        resp = client.post('/api/v1/link', json={
            'title': 'title',
            'long_url': 'https://rutgers.edu',
        })
        assert resp.status_code == 200
        link_id = resp.json['id']

    with dev_login(client, 'user'):
        resp = client.patch(f'/api/v1/link/{link_id}', json={
            'long_url': long_url,
        })
        assert resp.status_code == 400


@pytest.mark.parametrize(('long_url', 'expected'), [
    ('google.com', True),
    ('https://google.com', True),
    ('example.com', False),
    ('https://example.com', False),
    ('https://example.com/path/to?some=thing', False),
])
def test_validate_long_url(client: Client, long_url: str, expected: bool) -> None:
    blocked_long_url = 'https://example.com'
    blocked_long_url_b32 = str(base64.b32encode(bytes(blocked_long_url, 'utf8')), 'utf8')

    with dev_login(client, 'admin'):
        resp = client.put(f'/api/v1/role/blocked_url/entity/{blocked_long_url_b32}', json={})
        assert resp.status_code == 204

    long_url_b32 = str(base64.b32encode(bytes(long_url, 'utf8')), 'utf8')
    with dev_login(client, 'user'):
        resp = client.get(f'/api/v1/link/validate_long_url/{long_url_b32}')
        assert resp.status_code == 200
        assert resp.json['valid'] is expected


@pytest.mark.parametrize(('alias', 'expected'), [
    ('link', False),         # Endpoint name
    ('abcdef123', True),     # Should be valid
])
def test_validate_alias(client: Client, alias: str, expected: bool) -> None:
    alias_b32 = str(base64.b32encode(bytes(alias, 'utf8')), 'utf8')
    with dev_login(client, 'user'):
        resp = client.get(f'/api/v1/link/validate_alias/{alias_b32}')
        assert resp.status_code == 200
        assert resp.json['valid'] is expected


@pytest.mark.parametrize(('alias', 'expected'), [
    (10, False),             # Wrong type
    ('aaa', False),          # Too short
    ('!!!!!!!!', False),     # Bad characters
    ('link', False),         # Endpoint name
    ('abcdef123', True),     # Should be valid
])
def test_create_bad_alias(client: Client, alias: str, expected: bool) -> None:
    with dev_login(client, 'power'):
        resp = client.post('/api/v1/link', json={
            'title': 'title',
            'long_url': 'https://example.com',
        })
        assert resp.status_code == 200
        link_id = resp.json['id']

        resp = client.post(f'/api/v1/link/{link_id}/alias', json={
            'alias': alias,
        })

        if expected:
            assert resp.status_code == 200
        else:
            assert resp.status_code == 400


def test_link_not_owner(client: Client) -> None:
    """Test that a link cannot be manipulated by a non-owner."""

    # Create a link as DEV_ADMIN
    with dev_login(client, 'admin'):
        # Create a link and get its ID
        resp = client.post('/api/v1/link', json={
            'title': 'title',
            'long_url': 'https://example.com',
        })
        assert 200 <= resp.status_code < 300
        link_id = resp.json['id']

        # Add an alias
        resp = client.post(f'/api/v1/link/{link_id}/alias', json={
            'description': 'alias0',
        })
        assert 200 <= resp.status_code < 300
        alias0 = resp.json['alias']

    # Log in DEV_USER and check that we cannot view/edit the link or its alias
    with dev_login(client, 'user'):
        # Check that we cannot get link info
        resp = client.get(f'/api/v1/link/{link_id}')
        assert resp.status_code == 403

        # Check that we cannot get link visits
        resp = client.get(f'/api/v1/link/{link_id}/visits')
        assert resp.status_code == 403

        # Check that we cannot get link overall stats
        resp = client.get(f'/api/v1/link/{link_id}/stats')
        assert resp.status_code == 403

        # Check that we cannot get link visit stats
        resp = client.get(f'/api/v1/link/{link_id}/stats/visits')
        assert resp.status_code == 403

        # Check that we cannot get link GeoIP stats
        resp = client.get(f'/api/v1/link/{link_id}/stats/geoip')
        assert resp.status_code == 403

        # Check that we cannot get link browser stats
        resp = client.get(f'/api/v1/link/{link_id}/stats/browser')
        assert resp.status_code == 403

        # Check that we cannot edit the link
        resp = client.patch(f'/api/v1/link/{link_id}', json={
            'title': 'new title',
        })
        assert resp.status_code == 403

        # Check that we cannot clear visits
        resp = client.post(f'/api/v1/link/{link_id}/clear_visits')
        assert resp.status_code == 403

        # Check that we cannot delete the link
        resp = client.delete(f'/api/v1/link/{link_id}')
        assert resp.status_code == 403

        # Check that we cannot create a new alias
        resp = client.post(f'/api/v1/link/{link_id}/alias', json={
            'description': 'alias',
        })
        assert resp.status_code == 403

        # Check that we cannot get alias visits
        resp = client.get(f'/api/v1/link/{link_id}/alias/{alias0}/visits')
        assert resp.status_code == 403

        # Check that we cannot get alias overall stats
        resp = client.get(f'/api/v1/link/{link_id}/alias/{alias0}/stats')
        assert resp.status_code == 403

        # Check that we cannot get alias visit stats
        resp = client.get(f'/api/v1/link/{link_id}/alias/{alias0}/stats/visits')
        assert resp.status_code == 403

        # Check that we cannot get alias GeoIP stats
        resp = client.get(f'/api/v1/link/{link_id}/alias/{alias0}/stats/geoip')
        assert resp.status_code == 403

        # Check that we cannot get alias browser stats
        resp = client.get(f'/api/v1/link/{link_id}/alias/{alias0}/stats/browser')
        assert resp.status_code == 403

        # Check that we cannot delete alias
        resp = client.delete(f'/api/v1/link/{link_id}/alias/{alias0}')
        assert resp.status_code == 403


def test_get_link_info_bad_id(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.get('/api/v1/link/not_an_id')
        assert resp.status_code == 404


def test_get_link_nonexistent(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.get('/api/v1/link/5fa30b6801cc0db00872569b')
        assert resp.status_code == 404


def test_modify_link_nonexistent(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.patch('/api/v1/link/5fa30b6801cc0db00872569b', json={
            'title': 'new title',
        })
        assert resp.status_code == 404


def test_delete_link_nonexistent(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.delete('/api/v1/link/5fa30b6801cc0db00872569b')
        assert resp.status_code == 404


def test_clear_visits_nonexistent(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.post('/api/v1/link/5fa30b6801cc0db00872569b/clear_visits')
        assert resp.status_code == 404


def test_get_deleted(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.post('/api/v1/link', json={
            'title': 'title',
            'long_url': 'https://example.com',
        })
        assert resp.status_code == 200
        link_id = resp.json['id']

        # Create a random alias
        resp = client.post(f'/api/v1/link/{link_id}/alias', json={
            'description': 'alias0',
        })
        assert resp.status_code == 200
        alias0 = resp.json['alias']

        # Delete the alias
        resp = client.delete(f'/api/v1/link/{link_id}/alias/{alias0}')
        assert resp.status_code == 204

        # Check that the alias does not exist
        resp = client.get(f'/api/v1/link/{link_id}')
        assert resp.status_code == 200
        assert resp.json['aliases'] == []

    with dev_login(client, 'admin'):
        # Get the link info as admin, check that the alias exists
        resp = client.get(f'/api/v1/link/{link_id}')
        assert resp.status_code == 200
        assert len(resp.json['aliases']) == 1

        info = resp.json['aliases'][0]
        assert info['alias'] == alias0
        assert info['deleted'] is True

    with dev_login(client, 'user'):
        # Delete the link
        resp = client.delete(f'/api/v1/link/{link_id}')
        assert resp.status_code == 204

        # Check that the link info is no longer accessible
        resp = client.get(f'/api/v1/link/{link_id}')
        assert resp.status_code == 404

    with dev_login(client, 'admin'):
        # Check that the link info is accessible as admin
        resp = client.get(f'/api/v1/link/{link_id}')
        assert resp.status_code == 200
        assert resp.json['deleted'] is True


def test_visits(client: Client) -> None:  # pylint: disable=too-many-statements
    def assert_visits(url: str, total_visits: int, unique_visits: int) -> None:
        resp = client.get(url)
        assert resp.status_code == 200
        assert resp.json['total_visits'] == total_visits
        assert resp.json['unique_visits'] == unique_visits

    with dev_login(client, 'user'):
        resp = client.post('/api/v1/link', json={
            'title': 'title',
            'long_url': 'https://example.com',
        })
        assert resp.status_code == 200
        link_id = resp.json['id']

        # Create a random alias
        resp = client.post(f'/api/v1/link/{link_id}/alias', json={
            'description': 'alias0',
        })
        assert resp.status_code == 200
        alias0 = resp.json['alias']

        # Create another random alias
        resp = client.post(f'/api/v1/link/{link_id}/alias', json={
            'description': 'alias0',
        })
        assert resp.status_code == 200
        alias1 = resp.json['alias']

        # Visit alias0 once
        resp = client.get(f'/{alias0}')
        assert resp.status_code == 302

        # Visit alias1 twice
        resp = client.get(f'/{alias1}')
        assert resp.status_code == 302
        resp = client.get(f'/{alias1}')
        assert resp.status_code == 302

        # Get the link stats. Check that we have 3 visits and 1 unique visit
        assert_visits(f'/api/v1/link/{link_id}/stats', 3, 1)

        # Get the stats for alias0. Check that we have 1 visit and 1 unique visit
        assert_visits(f'/api/v1/link/{link_id}/alias/{alias0}/stats', 1, 1)

        # Get the stats for alias1. Check that we have 2 visits and 1 unique visit
        assert_visits(f'/api/v1/link/{link_id}/alias/{alias1}/stats', 2, 1)

        # Get the anonymized visits, make sure they make sense
        resp = client.get(f'/api/v1/link/{link_id}/visits')
        assert resp.status_code == 200
        assert all(visit['link_id'] == link_id for visit in resp.json['visits'])
        assert len(resp.json['visits']) == 3
        assert sum(1 for visit in resp.json['visits'] if visit['alias'] == alias0) == 1
        assert sum(1 for visit in resp.json['visits'] if visit['alias'] == alias1) == 2

        # Get the anonymized visits for alias0
        resp = client.get(f'/api/v1/link/{link_id}/alias/{alias0}/visits')
        assert resp.status_code == 200
        assert all(visit['link_id'] == link_id for visit in resp.json['visits'])
        assert all(visit['alias'] == alias0 for visit in resp.json['visits'])

        # Get the anonymized visits for alias1
        resp = client.get(f'/api/v1/link/{link_id}/alias/{alias1}/visits')
        assert resp.status_code == 200
        assert all(visit['link_id'] == link_id for visit in resp.json['visits'])
        assert all(visit['alias'] == alias1 for visit in resp.json['visits'])

        # Get the visit stats data
        resp = client.get(f'/api/v1/link/{link_id}/stats/visits')
        assert resp.status_code == 200
        assert len(resp.json['visits']) == 1
        assert resp.json['visits'][0]['first_time_visits'] == 1
        assert resp.json['visits'][0]['all_visits'] == 3

        resp = client.get(f'/api/v1/link/{link_id}/stats/geoip')
        assert resp.status_code == 200

        resp = client.get(f'/api/v1/link/{link_id}/stats/browser')
        assert resp.status_code == 200

        resp = client.get(f'/api/v1/link/{link_id}/alias/{alias0}/stats/visits')
        assert resp.status_code == 200
        assert len(resp.json['visits']) == 1
        assert resp.json['visits'][0]['first_time_visits'] == 1
        assert resp.json['visits'][0]['all_visits'] == 1

        resp = client.get(f'/api/v1/link/{link_id}/alias/{alias0}/stats/geoip')
        assert resp.status_code == 200

        resp = client.get(f'/api/v1/link/{link_id}/alias/{alias0}/stats/browser')
        assert resp.status_code == 200

        resp = client.get(f'/api/v1/link/{link_id}/alias/{alias1}/stats/visits')
        assert resp.status_code == 200
        assert len(resp.json['visits']) == 1
        assert resp.json['visits'][0]['first_time_visits'] == 1
        assert resp.json['visits'][0]['all_visits'] == 2

        # Clear visits. Check that everything has gone back to 0
        resp = client.post(f'/api/v1/link/{link_id}/clear_visits')
        assert resp.status_code == 204
        assert_visits(f'/api/v1/link/{link_id}/stats', 0, 0)
        assert_visits(f'/api/v1/link/{link_id}/alias/{alias0}/stats', 0, 0)
        assert_visits(f'/api/v1/link/{link_id}/alias/{alias1}/stats', 0, 0)

        # This time, execute visits with the DNT header set. All visits should be unique
        resp = client.get(f'/{alias0}', headers={'DNT': '1'})
        assert resp.status_code == 302
        resp = client.get(f'/{alias1}', headers={'DNT': '1'})
        assert resp.status_code == 302
        resp = client.get(f'/{alias1}', headers={'DNT': '1'})
        assert resp.status_code == 302

        # Get the link stats. Check that we have 3 visits and 3 unique visits
        assert_visits(f'/api/v1/link/{link_id}/stats', 3, 3)

        # Get the stats for alias0. Check that we have 1 visit and 1 unique visit
        assert_visits(f'/api/v1/link/{link_id}/alias/{alias0}/stats', 1, 1)

        # Get the stats for alias1. Check that we have 2 visits and 2 unique visits
        assert_visits(f'/api/v1/link/{link_id}/alias/{alias1}/stats', 2, 2)
