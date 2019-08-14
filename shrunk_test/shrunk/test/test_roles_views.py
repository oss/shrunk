import pytest

from shrunk import roles

from fixtures import app, db, client  # noqa: F401
from fixtures import dev_login
from assertions import assert_ok, assert_in_resp, assert_status, assert_redirect


@pytest.mark.parametrize('role', ['whitelisted'])
def test_list(client, role):
    def check(expected):
        resp = client.get(f'/roles/{role}/')
        assert_ok(resp)
        all(assert_in_resp(resp, e) for e in expected)

    with dev_login(client, 'admin'):
        check([])

        roles.grant(role, 'DEV_ADMIN', 'DEV_USER', None)
        check(['DEV_USER'])

        roles.grant(role, 'DEV_ADMIN', 'DEV_FACSTAFF', None)
        check(['DEV_USER', 'DEV_FACSTFAFF'])

        roles.grant(role, 'DEV_ADMIN', 'DEV_PWR_USER', None)
        check(['DEV_USER', 'DEV_FACSTFAFF', 'DEV_PWR_USER'])

        roles.revoke(role, 'DEV_FACSTAFF')
        check(['DEV_USER', 'DEV_PWR_USER'])

        roles.revoke(role, 'DEV_USER')
        check(['DEV_PWR_USER'])

        roles.revoke(role, 'DEV_PWR_USER')
        check([])


@pytest.mark.parametrize('role', ['whitelisted'])
def test_grant(client, role):
    with dev_login(client, 'admin'):
        req = {'entity': 'DEV_USER', 'comment': 'Test comment'}
        assert_status(client.post(f'/roles/{role}/', data=req), 302)
        assert roles.check(role, 'DEV_USER')


@pytest.mark.parametrize('role', ['whitelisted'])
def test_grant_twice(client, role):
    with dev_login(client, 'admin'):
        req = {'entity': 'DEV_USER', 'comment': 'Test comment'}
        assert_status(client.post(f'/roles/{role}/', data=req), 302)
        assert_status(client.post(f'/roles/{role}/', data=req), 400)


def test_grant_no_comment(client):
    with dev_login(client, 'admin'):
        req = {'entity': 'DEV_USER'}
        assert_status(client.post('/roles/whitelisted/', data=req), 400)


def test_grant_no_such_role(client):
    with dev_login(client, 'admin'):
        req = {'entity': 'DEV_USER'}
        assert_status(client.post('/roles/no_such_role/', data=req), 302)


def test_grant_invalid_entity(client):
    with dev_login(client, 'admin'):
        req = {'entity': 'not a valid url'}
        assert_status(client.post('/roles/blocked_url/', data=req), 400)


@pytest.mark.parametrize('role', ['whitelisted'])
def test_revoke(app, client, role):
    with app.app_context():
        roles.grant(role, 'DEV_ADMIN', 'DEV_USER', None)
    with dev_login(client, 'admin'):
        assert roles.check(role, 'DEV_USER')
        req = {'entity': 'DEV_USER'}
        assert_status(client.post(f'/roles/{role}/revoke', data=req), 302)
        assert not roles.check(role, 'DEV_USER')


def test_revoke_whitelist_no_perm(app, client):
    with app.app_context():
        roles.grant('whitelisted', 'DEV_ADMIN', 'DEV_USER', None)
    with dev_login(client, 'power'):
        req = {'entity': 'DEV_USER'}
        assert_status(client.post('/roles/whitelisted/revoke', data=req), 403)
        assert roles.check('whitelisted', 'DEV_USER')


def test_roles_no_session(client):
    assert_redirect(client.get('/roles/whitelisted/'), '/')


def test_whitelist_no_perm(client):
    with dev_login(client, 'user'):
        assert_status(client.get('/roles/whitelisted/'), 403)


def test_admin_blacklisted(app, client):
    with app.app_context():
        roles.grant('blacklisted', 'test', 'DEV_ADMIN', None)
    with dev_login(client, 'admin'):
        assert_status(client.get('/admin/'), 403)
