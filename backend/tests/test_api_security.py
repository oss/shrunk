import base64
import pytest
from werkzeug.test import Client
from util import dev_login

# TODO:

# Google Safe Browsing API will cache the link
# if a user sumbits it multiple times, you get an error 'Max retries exceeded
# with a specific url.

# to prevent, before checking with Safe Browsing API, check if it is in the
# unsafe_links collection first awaiting verification
# if it is approved, approve link. if it is rejected, send 403.
# if it is pending, send 403 as it is awaiting verfication.


# 2.
# test for LinkIsPendingOrRejected exception



def test_security_risk_client_method(client: Client) -> None:
    unsafe_link = 'http://malware.testing.google.test/testing/malware/*'
    unsafe_link_b32 = str(base64.b32encode(bytes(unsafe_link, 'utf8')), 'utf8')

    regular_link = 'https://google.com/'
    regular_link_b32 = str(base64.b32encode(bytes(regular_link, 'utf8')), 'utf8')

    with dev_login(client, 'admin'):
        # Create a link and get its message
        resp = client.get(f'/api/v1/security/security_test/{unsafe_link_b32}')
        assert resp.status_code == 200
        assert resp.json['detected']

        # Creating a link with a regular link should not be forbidden
        resp = client.get(f'/api/v1/security/security_test/{regular_link_b32}')
        assert resp.status_code == 200
        assert not resp.json['detected']

    with dev_login(client, 'user'):
        # A user that is not an admin cannot use the security_test endpoint
        resp = client.get(f'/api/v1/security/security_test/{unsafe_link_b32}')
        assert resp.status_code == 403

@pytest.mark.parametrize(('permission'), ['user', 'facstaff', 'power'])
def test_user_and_admin_security_link_abilities(client: Client, permission: str) -> None:
    unsafe_link = 'http://malware.testing.google.test/testing/malware/*'
    unsafe_link_title = 'unsafe link'
    regular_link = 'https://google.com'

    with dev_login(client, permission):
        # a user tries to shrink a link detected to be unsafe
        # this could be any user (admin, facstaff)
        resp = client.post('/api/v1/link', json={
            'title': unsafe_link_title,
            'long_url': unsafe_link
        })

        # this is a forbidden action. the link will then
        # become a pending link in the unsafe_links collection
        assert resp.status_code == 403
        with pytest.raises(KeyError) as err:
            link_id = resp.json['id']

    with dev_login(client, 'admin'):
        resp = client.post('/api/v1/link', json={
            'title': unsafe_link_title,
            'long_url': unsafe_link
        })

        # an admin cannot accidentally post an unsafe link
        # without first explicitly stating to bypass security
        assert resp.status_code == 403

        # when an admin specifies that a regular link should bypass
        # security, go through with the request
        resp = client.post('/api/v1/link', json={
            'title': unsafe_link_title,
            'long_url': regular_link,
            'bypass_security_measures': True
        })
        assert resp.status_code == 200
        link_id = resp.json['id']

        # test that the link was made successfully after forcing bypass
        resp = client.get(f'/api/v1/link/{link_id}')
        assert resp.status_code == 200
        assert resp.json['title'] == unsafe_link_title


@pytest.mark.parametrize(('permission'), ['user', 'facstaff', 'power'])
def test_security_api_permissions(client: Client, permission: str) -> None:
    with dev_login(client, permission):
        resp = client.get('/api/v1/security/pending_links')

        # regular users cannot fetch pending list
        assert resp.status_code == 403
        with pytest.raises(TypeError):
            assert resp.json['pendingLinks']

        # we post a random link so that we have an
        # objectID to work with. it does not matter what it is,
        # we just need an objectID to work with in order to call endpoints
        random_link = 'http://google.com'
        resp = client.post('/api/v1/link', json={
            'title': 'random',
            'long_url': random_link
        })
        link_id = resp.json['id']

        resp = client.patch(f'/api/v1/security/promote/{link_id}')
        assert resp.status_code == 403
        resp = client.get(f'/api/v1/security/status/{link_id}')
        assert resp.status_code == 403
        resp = client.patch(f'/api/v1/security/reject/{link_id}')
        assert resp.status_code == 403
        resp = client.patch(f'/api/v1/security/toggle')
        assert resp.status_code == 403
        resp = client.get(f'/api/v1/security/get_status')
        assert resp.status_code == 403


def test_verification_process(client: Client) -> None:
    unsafe_link = 'http://malware.testing.google.test/testing/malware/*'
    second_unsafe_link = 'http://malware.wicar.org/data/ms09_072_style_object.html'

    unsafe_link_title = 'unsafe link'
    unsafe_link_title_b32 = str(base64.b32encode(bytes(unsafe_link_title, 'utf8')), 'utf8')
    second_unsafe_link_title_b32 = str(base64.b32encode(bytes(second_unsafe_link_title_b32, 'utf8')), 'utf8')

    with dev_login(client, 'user'):
        # an unsafe link for promotion testing
        resp = client.post('/api/v1/link', json={
            'title': unsafe_link_title,
            'long_url': unsafe_link
        })
        assert resp.status_code == 403

        # we send the same request twice to see if
        # the security API will correctly handle it
        resp = client.post('/api/v1/link', json={
            'title': unsafe_link_title,
            'long_url': unsafe_link
        })
        assert resp.status_code == 403

        # a second unsafe link for rejecting testing
        resp = client.post('/api/v1/link', json={
            'title': 'second unsafe link',
            'long_url': second_unsafe_link
        })
        assert resp.status_code == 403

    with dev_login(client, 'admin'):
        resp = client.get('/api/v1/security/pending_links')
        assert resp.status_code == 200
        assert resp.json['pendingLinks']
        assert len(resp.json['pendingLinks']) == 2

        unsafe_link_document = resp.json['pendingLinks'][0]
        unsafe_link_id = unsafe_link_document['_id']
        assert unsafe_link_document['title'] == unsafe_link_title
        assert unsafe_link_document['long_url'] == unsafe_link

        second_unsafe_link_document = resp.json['pendingLinks'][1]
        second_unsafe_link_id = second_unsafe_link_document['_id']
        assert second_unsafe_link_document['title'] == 'second unsafe link'
        assert second_unsafe_link_document['long_url'] == second_unsafe_link

        resp = client.get(f'/api/v1/security/status/{unsafe_link_id}')
        assert resp.status_code == 200
        assert resp.json['status'] == 'pending'

        resp = client.get(f'/api/v1/security/status/{second_unsafe_link_id}')
        assert resp.status_code == 200
        assert resp.json['status'] == 'pending'

        # test that the link hasn't made through as a regular link
        # via a call to the link API
        # TODO: may be a vulnerable as, ofc, _id wouldn't be found in link collection
        resp = client.get(f'/api/v1/link/{unsafe_link_id}')
        assert resp.status_code == 404

        resp = client.patch(f'/api/v1/security/promote/{unsafe_link_id}')
        assert resp.status_code == 200
        resp = client.get(f'/api/v1/security/status/{unsafe_link_id}')
        assert resp.status_code == 200
        assert resp.json['status'] == 'approved'

        # when we promote a link, the link is able to be
        # retrieved from the links API as it is in the general collection
        resp = client.get(f'/api/v1/link/search_by_title/{unsafe_link_title_b32}')
        assert resp.status_code == 200
        assert resp.json['title'] == unsafe_link_title
        assert resp.json['long_url'] == unsafe_link
        assert len(resp.json['aliases']) == 1

        # promoted unsafe link cannot be rejected
        resp = client.patch(f'/api/v1/security/reject/{unsafe_link_id}')
        assert resp.status_code == 409

        # =======================Second Unsafe Link==================

        resp = client.patch(f'/api/v1/security/reject/{second_unsafe_link_id}')
        assert resp.status_code == 200
        resp = client.get(f'/api/v1/security/status/{second_unsafe_link_id}')
        assert resp.status_code == 200
        assert resp.json['status'] == 'denied'
        resp = client.get(f'/api/v1/link/search_by_title/{second_unsafe_link_title_b32}')
        assert resp.status_code == 404


def test_toggle_security(client: Client) -> None:
    unsafe_link = 'http://malware.testing.google.test/testing/malware/*'
    unsafe_link_title = 'unsafe link'

    with dev_login(client, 'admin'):
        resp = client.get(f'/api/v1/security/get_status')
        assert resp.status_code == 200
        assert resp.json['status'] == 'on'

        resp = client.patch(f'/toggle')
        assert resp.status_code == 200

        resp = client.get(f'/api/v1/security/get_status')
        assert resp.status_code == 200
        assert resp.json['status'] == 'off'

    with dev_login(client, 'user'):
        resp = client.post('/api/v1/link', json={
            'title': unsafe_link_title,
            'long_url': unsafe_link
        })
        assert resp.status_code == 200

    with dev_login(client, 'admin'):
        resp = client.patch(f'/toggle')
        assert resp.status_code == 200

        resp = client.get(f'/api/v1/security/get_status')
        assert resp.status_code == 200
        assert resp.json['status'] == 'on'

    with dev_login(client, 'user'):
        resp = client.post('/api/v1/link', json={
            'title': 'IM GOING TO HACK RUTGERS LMAO !!!!!!!!! WOOOOOOo',
            'long_url': unsafe_link
        })
        assert resp.status_code == 403
