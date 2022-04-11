from ast import Str
import time
import base64
from datetime import datetime, timezone, timedelta
import random

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
    """
    Test that we can create a link with an expiration time.

    With the implementation of verifying links with Google Safe Browsing API,
    this test would fail due to the fact that the link expired too fast
    because the API needed time to respond. If there were recent changes to
    the link creation pipeline and this test fails, try increasing the link
    expiration time so that links don't expire before they are tested.

    """

    with dev_login(client, 'admin'):
        # Create a link that expires 500 ms in the future
        expiration_time = datetime.now(timezone.utc) + timedelta(milliseconds=500)
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

        # Sleep 1 second
        time.sleep(1)

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
        resp = client.get(f'/api/v1/link/validate_reserved_alias/{alias_b32}')
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

def test_create_link_acl(client: Client) -> None:  # pylint: disable=too-many-statements
    """This test simulates the process of creating a link with ACL options and testing if the permissions works"""

    with dev_login(client, 'facstaff'):
        def check_create(body):
            resp = client.post('/api/v1/link', json=body)
            if 'errors' in resp.json:
                return resp.json, resp.status_code
            link_id = resp.json['id']
            status = resp.status_code
            resp = client.get(f'/api/v1/link/{link_id}')
            return resp.json, status

        # make sure Editors are viewers
        link, status = check_create({
            'title': 'title',
            'long_url': 'https://example.com',
            'editors': [{'_id': 'DEV_ADMIN', 'type': 'netid'}]
        })
        assert 200 <= status < 300
        assert len(link['viewers']) == 1

        # viewer not editor
        link, status = check_create({
            'title': 'title',
            'long_url': 'https://example.com',
            'viewers': [{'_id': 'DEV_ADMIN', 'type': 'netid'}]
        })
        assert 200 <= status < 300
        assert len(link['editors']) == 0

        # deduplicate
        link, status = check_create({
            'title': 'title',
            'long_url': 'https://example.com',
            'viewers': [{'_id': 'DEV_ADMIN', 'type': 'netid'},
                        {'_id': 'DEV_ADMIN', 'type': 'netid'}]
        })
        assert 200 <= status < 300
        assert len(link['viewers']) == 1

        # orgs must be objectid
        link, status = check_create({
            'title': 'title',
            'long_url': 'https://example.com',
            'viewers': [{'_id': 'DEV_ADMIN', 'type': 'org'}]
        })
        assert status == 400
        assert 'errors' in link

        # orgs disallows invalid org
        link, status = check_create({
            'title': 'title',
            'long_url': 'https://example.com',
            'viewers': [{'_id': '5fbed163b7202e4c33f01a93', 'type': 'org'}]
        })
        assert status == 400
        assert 'errors' in link

        # org allows valid org
        resp = client.post('/api/v1/org', json={
            'name': 'testorg11'
        })
        assert 200 <= resp.status_code <= 300
        _id = resp.json['id']

        link, status = check_create({
            'title': 'title',
            'long_url': 'https://example.com',
            'viewers': [{'_id': _id, 'type': 'org'}]
        })
        assert 200 <= status <= 300
        assert len(link['viewers']) == 1
        assert len(link['editors']) == 0

def test_update_link_acl(client: Client) -> None:  # pylint: disable=too-many-statements
    """This test simulates the process of creating a link with ACL options and testing if the permissions works"""

    with dev_login(client, 'facstaff'):
        resp = client.post('/api/v1/link', json={
            'title': 'title',
            'long_url': 'https://example.com'
        })
        assert 200 <= resp.status_code <= 300
        link_id = resp.json['id']

        def mod_acl(action, entry, acl):
            resp = client.patch(f'/api/v1/link/{link_id}/acl', json={
                'action': action, 'acl': acl,
                'entry': entry
            })
            print(resp.json)
            if resp.status_code >= 400:
                return resp.json, resp.status_code
            status = resp.status_code
            resp = client.get(f'/api/v1/link/{link_id}')
            return resp.json, status

        person = {'_id': 'roofus', 'type': 'netid'}
        person2 = {'_id': 'doofus', 'type': 'netid'}
        inv_org = {'_id': 'not_obj_id', 'type': 'org'}
        inv_org2 = {'_id': '5fbed163b7202e4c33f01a93', 'type': 'org'}

        # add viewer
        link, status = mod_acl('add', person, 'viewers')
        assert 200 <= status <= 300
        assert len(link['viewers']) == 1
        assert len(link['editors']) == 0

        # duplicates should be ignored
        link, status = mod_acl('add', person, 'viewers')
        assert 200 <= status <= 300
        assert len(link['viewers']) == 1
        assert len(link['editors']) == 0


        # remove viewer works
        mod_acl('add', person2, 'viewers')
        link, status = mod_acl('remove', person, 'viewers')
        assert 200 <= status <= 300
        assert len(link['viewers']) == 1
        assert len(link['editors']) == 0
        # assert correct one is removed
        assert link['viewers'][0]['_id'] == person2['_id']
        mod_acl('remove', person2, 'viewers')

        # add editor adds viewer
        link, status = mod_acl('add', person, 'editors')
        assert 200 <= status <= 300
        assert len(link['editors']) == 1
        assert len(link['viewers']) == 1
        # remove viewer removes editor
        link, status = mod_acl('remove', person, 'viewers')
        assert 200 <= status <= 300
        assert len(link['viewers']) == 0
        assert len(link['editors']) == 0

        # remove editor doesn't remove viewer
        mod_acl('add', person, 'editors')
        link, status = mod_acl('remove', person, 'editors')
        assert 200 <= status <= 300
        assert len(link['viewers']) == 1
        assert len(link['editors']) == 0
        mod_acl('remove', person, 'viewers')

        # remove nonexistant doesn't throw exception
        link, status = mod_acl('remove', person, 'editors')
        assert status < 500
        assert len(link['viewers']) == 0
        assert len(link['editors']) == 0
        mod_acl('remove', person, 'viewers')

        # add org invalid id rejected
        link, status = mod_acl('add', inv_org, 'viewers')
        assert status == 400

        link, status = mod_acl('add', inv_org2, 'viewers')
        assert status == 400


        # add valid org
        resp = client.post('/api/v1/org', json={
            'name': 'testorg11'
        })
        assert 200 <= resp.status_code <= 300
        org_id = resp.json['id']
        link, status = mod_acl('add', {'_id': org_id, 'type': 'org'}, 'viewers')
        assert 200 <= status <= 300
        assert len(link['viewers']) == 1
        assert len(link['editors']) == 0

        _, status = mod_acl('remove', {'_id': org_id, 'type': 'org'}, 'viewers')
        assert 200 <= status <= 300

        # add owner doesn't actually add them to the list

        link, status = mod_acl('add', {'_id': 'DEV_FACSTAFF', 'type': 'netid'}, 'editors')
        assert 200 <= status <= 300
        assert len(link['viewers']) == 0
        assert len(link['editors']) == 0

def test_acl(client: Client) -> None: # pylint: disable=too-many-statements
    link_id = ''
    alias = ''
    with dev_login(client, 'admin'):
        # create org
        resp = client.post('/api/v1/org', json={
            'name': 'testorg12'
        })
        assert 200 <= resp.status_code <= 300
        org_id = resp.json['id']

        # add whitelisted to it
        netid = 'DEV_FACSTAFF' # todo, no whitelisted dev login
        resp = client.put(f'/api/v1/org/{org_id}/member/{netid}')
        assert 200 <= resp.status_code <= 300

        # create link with editor: user, viewer: org
        resp = client.post('/api/v1/link', json={
            'title': 'testlink2333',
            'long_url': 'https://example.com',
            'editors': [{'_id': 'DEV_USER', 'type': 'netid'}],
            'viewers': [{'_id': org_id, 'type': 'org'}]
        })
        assert 200 <= resp.status_code <= 300
        link_id = resp.json['id']

        resp = client.post(f'/api/v1/link/{link_id}/alias', json={})
        assert 200 <= resp.status_code <= 300
        alias = resp.json['alias']

        resp = client.get(f'/api/v1/link/{link_id}')
        print(resp.json)

    permissions_table = [
        {'user': 'user', # editor
         'delete': False,
         'delete_alias': False,
         'clear_visits': False,

         'update_url': True,
         'update_acl': True,
         'create_alias': True,

         'get': True,
         'view_stats': True,
         'view_alias_stats': True
        },
        {'user': 'facstaff', # viewer (shared through org)
         'delete': False,
         'delete_alias': False,
         'clear_visits': False,

         'update_url': False,
         'update_acl': False,
         'create_alias': False,

         'get': True,
         'view_stats': True,
         'view_alias_stats': True
        },
        {'user': 'power', # not shared
         'delete': False,
         'delete_alias': False,
         'clear_visits': False,

         'update_url': False,
         'update_acl': False,
         'create_alias': False,

         'get': False,
         'view_stats': False,
         'view_alias_stats': False
        }
    ]

    def assert_access(desired, code):
        if desired:
            assert 200 <= code <= 300
        else:
            assert code == 403


    for user in permissions_table:
        print(user['user'])

        with dev_login(client, user['user']):
            resp = client.delete(f'/api/v1/link/{link_id}')
            assert resp.status_code == 403

            resp = client.post(f'/api/v1/link/{link_id}/clear_visits')
            assert resp.status_code == 403

            resp = client.delete(f'/api/v1/link/{link_id}/alias/{alias}')
            assert resp.status_code == 403

            resp = client.patch(f'/api/v1/link/{link_id}', json={
                'long_url': 'https://example.com?rand=' + str(random.randrange(0, 1000))
            })
            assert_access(user['update_url'], resp.status_code)

            resp = client.patch(f'/api/v1/link/{link_id}/acl', json={
                'entry': {
                    '_id': 'roofus' + str(random.randrange(0, 1000)),
                    'type': 'netid'
                },
                'acl': 'viewers',
                'action': 'add'
            })
            assert_access(user['update_acl'], resp.status_code)

            resp = client.post(f'/api/v1/link/{link_id}/alias', json={})
            assert_access(user['create_alias'], resp.status_code)

            resp = client.get(f'/api/v1/link/{link_id}')
            assert_access(user['get'], resp.status_code)

            for endpoint in ['stats', 'stats/browser', 'stats/geoip', 'stats/visits', 'visits']:
                resp = client.get(f'/api/v1/link/{link_id}/{endpoint}')
                assert_access(user['view_stats'], resp.status_code)

            for endpoint in ['stats', 'stats/browser', 'stats/geoip', 'stats/visits', 'visits']:
                resp = client.get(f'/api/v1/link/{link_id}/alias/{alias}/{endpoint}')
                assert_access(user['view_alias_stats'], resp.status_code)


def test_security_risk_client_method(client: Client) -> None:
    unsafe_link = 'http://malware.testing.google.test/testing/malware/*'
    unsafe_link_b32 = str(base64.b32encode(bytes(unsafe_link, 'utf8')), 'utf8')

    regular_link = 'https://google.com/'
    regular_link_b32 = str(base64.b32encode(bytes(regular_link, 'utf8')), 'utf8')

    with dev_login(client, 'admin'):
        # Create a link and get its message
        resp = client.get(f'/api/v1/link/security_test/{unsafe_link_b32}')
        assert resp.status_code == 200
        assert resp.json['detected']

        # Creating a link with a regular link should not be forbidden
        resp = client.get(f'/api/v1/link/security_test/{regular_link_b32}')
        assert resp.status_code == 200
        assert not resp.json['detected']

    with dev_login(client, 'user'):
        # A user that is not an admin cannot use the security_test endpoint
        resp = client.get(f'/api/v1/link/security_test/{unsafe_link_b32}')
        assert resp.status_code == 403

# TODO:
# ADD a test that checks that when the Google API is NOT WORKING
# that all links are created without any impact to link creation

@pytest.mark.parametrize(('permission'), ['user', 'facstaff', 'power'])
def test_unsafe_link_found(client: Client, permission: Str) -> None:
    unsafe_link = 'http://malware.testing.google.test/testing/malware/*'
    regular_link = 'https://google.com/'
    forbidden_message = 'The submitted link has been detected to be unsafe. \
        If you know that the link is safe, please do not be alarmed. \
        The link, along with your netID and full name, has been sent to \
        oss@oss.rutgers.edu for verification. We apologize for the \
        inconvenience and we\'ll approve your request promptly.'

    warning_message = 'The submitted link has been detected to be unsafe. \
        As an admin, please be careful before accepting this link. \
        Investigate first, consult another human being, and make sure this \
        link is safe.'

    # Log in as a user and test that a user cannot add a link that has been
    # detected to be unsafe. Also, test this is true for all users excepts
    # admins.
    with dev_login(client,  permission):
        resp = client.post('/api/v1/link', json={
            'title': 'Bad Link',
            'long_url': unsafe_link,
        })
        assert 400 <= resp.status_code < 500
        assert resp.json['errors'][0] == 'security risk'
        # assert forbidden_message == resp.json['warning_unsafe_link_message']

        # A regular user cannot bypass link security measures
        resp = client.post('/api/v1/link', json={
            'title': 'Bad Link',
            'long_url': unsafe_link,
            'bypass_security_measures': True
        })
        assert resp.status_code == 403

        # TODO: Check that the link doesn't exist after forbidden action

    with dev_login(client, 'admin'):
        # when an admin does not specify that an unsafe link
        # should bypass security measures, server should reject
        # the post request
        resp = client.post('/api/v1/link', json={
            'title': 'Bad Link',
            'long_url': unsafe_link,
        })
        assert resp.status_code == 403
        assert resp.json['errors'][0] == 'security risk'

        # when an admin specifies that a regular link should bypass
        # security, go through with the request
        resp = client.post('/api/v1/link', json={
            'title': 'Bad Link',
            'long_url': regular_link,
            'bypass_security_measures': True
        })
        assert resp.status_code == 200

        # an admin can bypass security measures for an unsafe link
        resp = client.post('/api/v1/link', json={
            'title': 'Bad Link',
            'long_url': unsafe_link,
            'bypass_security_measures': True
        })
        assert resp.status_code == 200


def test_pending_links_verification_process(client: Client) -> None:
    unsafe_link = 'http://malware.testing.google.test/testing/malware/*'
    unsafe_link_b32 = str(base64.b32encode(bytes(unsafe_link, 'utf8')), 'utf8')

    link_id = None

    with dev_login(client, 'user'):
        # a user tries to shrink a link detected to be unsafe
        # this could be any user (admin, facstaff)
        resp = client.post('/api/v1/link', json={
            'title': 'unsafe link',
            'long_url': unsafe_link
        })

        # this is a forbidden action. the link will then
        # become a pending link in the unsafe_links collection
        assert resp.status_code == 403
        link_id = resp.json['id']
        assert link_id is not None

        # a user tries to shrink a link detected to be unsafe
        # this could be any user (admin, facstaff)
        resp = client.post('/api/v1/link', json={
            'title': 'second unsafe link',
            'long_url': unsafe_link
        })

        assert resp.status_code == 403

        # we try to get a list of all lists pending verifications as a REGULAR user
        resp = client.get('/api/v1/link/security/pending_list')

        # regular users cannot fetch pending list
        assert resp.status_code == 403
        with pytest.raises(KeyError):
            assert resp.json['pendingLinks']

    with dev_login(client, 'admin'):
        # test that an admin can get a list of links pending verification
        resp = client.get('/api/v1/security/pending_list')
        assert resp.json['pendingLinks']

        # the link created by the regular user is the only pending link
        assert len(resp.json['pendingLinks']) == 2

        unsafe_link_document = resp['pendingLinks'][0]
        assert unsafe_link_document['title'] == 'unsafe link'
        assert unsafe_link_document['long_url'] == unsafe_link

        resp = client.get(f'/api/v1/security/status/{link_id}')
        assert resp.status_code == 200
        assert resp.json['status'] == 'pending'

        # test that the link hasn't made through as a regular link
        # via a call to the link API
        resp = client.get(f'/api/v1/link/{link_id}')
        assert resp.status_code == 404

        # ========== Link Promotion Testing

        resp = client.patch(f'/api/v1/security/promote/{link_id}')
        assert resp.status_code == 200

        resp = client.get(f'/api/v1/security/status/{link_id}')

        assert resp.status_code == 200
        assert resp.json['status'] == 'approved'

        # when we promote a link, the link is able to be
        # retrieved from the links API as it is in the general collection
        resp = client.get(f'/api/v1/link/{link_id}')
        assert resp.status_code == 200
        assert resp.json['title'] == 'unsafe link'

        # ========== Link Promotion Testing

        # promoted unsafe link cannot be rejected
        resp = client.patch(f'/api/v1/security/reject/{link_id}')
        assert resp.status_code == 409

        resp = client.patch(f'/api/v1/security/demotel')

        resp = client.get(f'/api/v1/security/status/{link_id}')
        assert resp.status_code == 200
        assert resp.json['status'] == 'denied'

        resp = client.patch('/api/v1/security/demote/<link_id>')

        resp = client.get('/api/v1/security/status/<link_id>')

        resp = client.get('/api/v1/security/check/{unsafe)}')

