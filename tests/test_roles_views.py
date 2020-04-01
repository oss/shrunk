import pytest

from util import assert_ok, assert_in_resp, assert_status, assert_redirect, dev_login


@pytest.mark.parametrize('role', ['whitelisted'])
def test_list(client, role, db):
    def check(expected):
        resp = client.get(f'/app/roles/{role}/')
        assert_ok(resp)
        all(assert_in_resp(resp, e) for e in expected)

    with dev_login(client, 'admin'):
        check([])

        db.grant_role(role, 'DEV_ADMIN', 'DEV_USER', None)
        check(['DEV_USER'])

        db.grant_role(role, 'DEV_ADMIN', 'DEV_FACSTAFF', None)
        check(['DEV_USER', 'DEV_FACSTFAFF'])

        db.grant_role(role, 'DEV_ADMIN', 'DEV_PWR_USER', None)
        check(['DEV_USER', 'DEV_FACSTFAFF', 'DEV_PWR_USER'])

        db.revoke_role(role, 'DEV_FACSTAFF')
        check(['DEV_USER', 'DEV_PWR_USER'])

        db.revoke_role(role, 'DEV_USER')
        check(['DEV_PWR_USER'])

        db.revoke_role(role, 'DEV_PWR_USER')
        check([])


@pytest.mark.parametrize('role', ['whitelisted'])
def test_grant(client, role, db):
    with dev_login(client, 'admin'):
        req = {'entity': 'DEV_USER', 'comment': 'Test comment'}
        assert_status(client.post(f'/app/roles/{role}/grant', data=req), 302)
        assert db.check_role(role, 'DEV_USER')


@pytest.mark.parametrize('role', ['whitelisted'])
def test_grant_twice(client, role):
    with dev_login(client, 'admin'):
        req = {'entity': 'DEV_USER', 'comment': 'Test comment'}
        assert_status(client.post(f'/app/roles/{role}/grant', data=req), 302)
        assert_status(client.post(f'/app/roles/{role}/grant', data=req), 400)


def test_grant_no_comment(client):
    with dev_login(client, 'admin'):
        req = {'entity': 'DEV_USER'}
        assert_status(client.post('/app/roles/whitelisted/grant', data=req), 400)


def test_grant_no_such_role(client):
    with dev_login(client, 'admin'):
        req = {'entity': 'DEV_USER'}
        assert_status(client.post('/app/roles/no_such_role/grant', data=req), 302)


def test_grant_invalid_entity(client):
    with dev_login(client, 'admin'):
        req = {'entity': 'not a valid url'}
        assert_status(client.post('/app/roles/blocked_url/grant', data=req), 400)


@pytest.mark.parametrize('role', ['whitelisted'])
def test_revoke(app, client, role, db):
    with app.app_context():
        db.grant_role(role, 'DEV_ADMIN', 'DEV_USER', None)
    with dev_login(client, 'admin'):
        assert db.check_role(role, 'DEV_USER')
        req = {'entity': 'DEV_USER'}
        assert_status(client.post(f'/app/roles/{role}/revoke', data=req), 302)
        assert not db.check_role(role, 'DEV_USER')


def test_revoke_whitelist_no_perm(app, client, db):
    with app.app_context():
        db.grant_role('whitelisted', 'DEV_ADMIN', 'DEV_USER', None)
    with dev_login(client, 'power'):
        req = {'entity': 'DEV_USER'}
        assert_status(client.post('/app/roles/whitelisted/revoke', data=req), 403)
        assert db.check_role('whitelisted', 'DEV_USER')


def test_roles_no_session(client):
    assert_redirect(client.get('/app/roles/whitelisted/'), '/')


def test_whitelist_no_perm(client):
    with dev_login(client, 'user'):
        assert_status(client.get('/app/roles/whitelisted/'), 403)


def test_admin_blacklisted(app, client, db):
    with app.app_context():
        db.grant_role('blacklisted', 'test', 'DEV_ADMIN', None)
    with dev_login(client, 'admin'):
        assert_status(client.get('/app/admin/'), 403)
