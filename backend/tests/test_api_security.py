from ast import Str
import time
import base64
from datetime import datetime, timezone, timedelta
import random

import pytest
from werkzeug.test import Client

from util import dev_login


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

    with dev_login(client, 'admin'):
        resp = client.post('/api/v1/link', json={
            'title': 'unsafe link',
            'long_url': unsafe_link
        })

        # an admin cannot accidentally post an unsafe link
        # without first explicitly stating to bypass security
        assert resp.status_code == 403


def test_security_api_permissions(client: Client) -> None:
    with dev_login(client, 'user'):
        resp = client.get('/api/v1/link/security/pending_list')

        # regular users cannot fetch pending list
        assert resp.status_code == 403
        with pytest.raises(KeyError):
            assert resp.json['pendingLinks']

        resp = client.patch(f'/api/v1/security/promote/{link_id}')
        assert resp.status_code == 403
        resp = client.get(f'/api/v1/security/status/{link_id}')
        assert resp.status_code == 403
        resp = client.patch(f'/api/v1/security/reject/{link_id}')
        assert resp.status_code == 403
        resp = client.get(f'/api/v1/security/pending_links/{link_id}')
        assert resp.status_code == 403


def test_retrieve_pending_links(client: Client) -> None:
    unsafe_link = 'http://malware.testing.google.test/testing/malware/*'
    link_id = None
    with dev_login(client, 'user'):
        # an unsafe link for promotion testing
        resp = client.post('/api/v1/link', json={
            'title': 'unsafe link',
            'long_url': unsafe_link
        })
        assert resp.status_code == 403

        # we send the same request twice to see if
        # the security API will correctly handle it
        resp = client.post('/api/v1/link', json={
            'title': 'unsafe link',
            'long_url': unsafe_link
        })
        assert resp.status_code == 403

        # a second unsafe link for rejecting testing
        resp = client.post('/api/v1/link', json={
            'title': 'second unsafe link',
            'long_url': unsafe_link
        })
        assert resp.status_code == 403

    with dev_login(client, 'admin'):
        resp = client.get('/api/v1/security/pending_list')
        assert resp.status_code == 200
        assert resp.json['pendingLinks']
        assert len(resp.json['pendingLinks']) == 2

        unsafe_link_document = resp.json['pendingLinks'][0]
        unsafe_link_id = unsafe_link_document['id']
        assert unsafe_link_document['title'] == 'unsafe link'
        assert unsafe_link_document['long_url'] == unsafe_link

        second_unsafe_link_document = resp.json['pendingLinks'][1]
        second_unsafe_link_id = unsafe_link_document['id']
        assert second_unsafe_link_document['title'] == 'second unsafe link'
        assert second_unsafe_link_document['long_url'] == unsafe_link

        resp = client.get(f'/api/v1/security/status/{unsafe_link_id}')
        assert resp.status_code == 200
        assert resp.json['status'] == 'pending'

        # test that the link hasn't made through as a regular link
        # via a call to the link API
        resp = client.get(f'/api/v1/link/{link_id}')
        assert resp.status_code == 404

        resp = client.patch(f'/api/v1/security/promote/{unsafe_link_id}')
        assert resp.status_code == 200
        resp = client.get(f'/api/v1/security/status/{unsafe_link_id}')
        assert resp.status_code == 200
        assert resp.json['status'] == 'approved'

        # when we promote a link, the link is able to be
        # retrieved from the links API as it is in the general collection
        resp = client.get(f'/api/v1/link/{unsafe_link_id}')
        assert resp.status_code == 200
        assert resp.json['title'] == 'unsafe link'

        # promoted unsafe link cannot be rejected
        resp = client.patch(f'/api/v1/security/reject/{unsafe_link_id}')
        assert resp.status_code == 409

        # =======================Second Unsafe Link==================

        resp = client.patch(f'/api/v1/security/reject/{second_unsafe_link_id}')
        assert resp.status_code == 409
        resp = client.get(f'/api/v1/security/status/{link_id}')
        assert resp.status_code == 200
        assert resp.json['status'] == 'denied'



