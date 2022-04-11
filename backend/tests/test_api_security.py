from ast import Str
import time
import base64
from datetime import datetime, timezone, timedelta
import random

import pytest
from werkzeug.test import Client

from util import dev_login


@pytest.fixture
def create_a_pending_link(client: Client):
    link_id = None
    with dev_login(client, 'user'):
         resp = client.post('/api/v1/link', json={
            'title': 'unsafe link',
            'long_url': unsafe_link
        })
        assert resp.status_code == 403




def test_user_cannot_create_unsafe_link(client: Client) -> None:
    unsafe_link = 'http://malware.testing.google.test/testing/malware/*'
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


def test_security_api_permissions(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.get('/api/v1/link/security/pending_list')

        # regular users cannot fetch pending list
        assert resp.status_code == 403
        with pytest.raises(KeyError):
            assert resp.json['pendingLinks']

        resp = client.patch(f'/api/v1/link/security/promote/{link_id}')
        assert resp.status_code == 403
        resp = client.get(f'/api/v1/link/security/status/{link_id}')
        assert resp.status_code == 403
        resp = client.patch(f'/api/v1/link/security/demote/{link_id}')
        assert resp.status_code == 403
        resp = client.patch(f'/api/v1/link/security/reject/{link_id}')
        assert resp.status_code == 403
        resp = client.patch(f'/api/v1/link/security/reject/{link_id}')
        assert resp.status_code == 403
        resp = client.get(f'/api/v1/link/security/pending_links/{link_id}')
        assert resp.status_code == 403


def test_verification_process(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.post('/api/v1/link', json={
            'title': 'unsafe link',
            'long_url': unsafe_link
        })
        assert resp.status_code == 403
        link_id = resp.json['id']
        assert link_id is not None

        # we send the same request twice to see if
        # the security API will correctly handle it
        resp = client.post('/api/v1/link', json={
            'title': 'unsafe link',
            'long_url': unsafe_link
        })
        assert resp.status_code == 403
        link_id = resp.json['id']
        assert link_id is not None

    with dev_login(client, 'admin'):


