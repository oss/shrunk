import pytest

from fixtures import app, client  # noqa: F401
from fixtures import dev_login
from assertions import assert_ok, assert_status, assert_redirect, assert_in_resp

def create_org(client, name):
    return client.post('/orgs/create', data={'name': name})


def delete_org(client, name):
    return client.post('/orgs/delete', data={'name': name})


def add_member(client, name, netid, is_admin=False):
    req = {
        'name': name,
        'netid': netid,
        'is_admin': 'true' if is_admin else 'false'
    }
    return client.post('/orgs/add_member', data=req)


def remove_member(client, name, netid):
    req = {'name': name, 'netid': netid}
    return client.post('/orgs/remove_member', data=req)


def test_create_org(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))


def test_create_org_no_name(client):
    with dev_login(client, 'facstaff'):
        assert_status(client.post('/orgs/create', data={}), 400)


@pytest.mark.parametrize('name', ['', '!@#$*#(', ','])
def test_create_org_bad_name(client, name):
    with dev_login(client, 'facstaff'):
        assert_status(create_org(client, name), 400)


def test_create_org_twice(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_status(create_org(client, 'test_org'), 400)


def test_create_org_no_perm(client):
    with dev_login(client, 'user'):
        assert_status(create_org(client, 'test_org'), 403)

    with dev_login(client, 'power'):
        assert_status(create_org(client, 'test_org'), 403)


def test_delete_org(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_redirect(delete_org(client, 'test_org'), '/orgs')


def test_delete_org_no_name(client):
    with dev_login(client, 'facstaff'):
        assert_status(delete_org(client, ''), 400)


def test_delete_org_no_perm(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))

    with dev_login(client, 'user'):
        assert_status(delete_org(client, 'test_org'), 403)


def test_manage_org_no_name(client):
    with dev_login(client, 'facstaff'):
        assert_status(client.get('/orgs/manage'), 400)
        assert_status(client.get('/orgs/manage?name='), 400)


def test_manage_org_no_perm(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))

    with dev_login(client, 'user'):
        assert_status(client.get('/orgs/manage?name=test_org'), 403)


def test_add_member(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_ok(add_member(client, 'test_org', 'DEV_USER'))

    with dev_login(client, 'user'):
        assert_ok(client.get('/orgs/manage?name=test_org'))


def test_add_member_twice(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_ok(add_member(client, 'test_org', 'DEV_USER'))
        assert_status(add_member(client, 'test_org', 'DEV_USER'), 400)


def test_add_member_no_perm(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))

    with dev_login(client, 'power'):
        assert_status(add_member(client, 'test_org', 'DEV_ADMIN'), 403)


def test_add_member_no_name(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        req = {'name': '', 'netid': 'DEV_USER'}
        assert_status(client.post('/orgs/add_member', data=req), 400)
        req = {'netid': 'DEV_USER'}
        assert_status(client.post('/orgs/add_member', data=req), 400)


def test_add_member_no_netid(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        req = {'name': 'test_org', 'netid': ''}
        assert_status(client.post('/orgs/add_member', data=req), 400)
        req = {'name': 'test_org'}
        assert_status(client.post('/orgs/add_member', data=req), 400)


def test_remove_member(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_ok(add_member(client, 'test_org', 'DEV_USER'))
        assert_ok(remove_member(client, 'test_org', 'DEV_USER'))


def test_remove_member_no_such_org(client):
    with dev_login(client, 'facstaff'):
        assert_status(remove_member(client, 'test_org', 'DEV_USER'), 403)


def test_remove_member_no_such_member(client, app):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_status(remove_member(client, 'test_org', 'DEV_USER'), 404)


def test_remove_member_no_perm(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_ok(add_member(client, 'test_org', 'DEV_USER'))

    with dev_login(client, 'power'):
        assert_status(remove_member(client, 'test_org', 'DEV_USER'), 403)


def test_remove_member_no_name(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_ok(add_member(client, 'test_org', 'DEV_USER'))
        req = {'name': '', 'netid': 'DEV_USER'}
        assert_status(client.post('/orgs/remove_member', data=req), 400)
        req = {'netid': 'DEV_USER'}
        assert_status(client.post('/orgs/remove_member', data=req), 400)


def test_remove_member_no_netid(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_ok(add_member(client, 'test_org', 'DEV_USER'))
        req = {'name': 'test_org', 'netid': ''}
        assert_status(client.post('/orgs/remove_member', data=req), 400)
        req = {'name': 'test_org'}
        assert_status(client.post('/orgs/remove_member', data=req), 400)

def test_add_admin(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_ok(add_member(client, 'test_org', 'DEV_USER', is_admin=True))

    with dev_login(client, 'user'):
        assert_redirect(delete_org(client, 'test_org'), '/orgs')


def test_add_admin_no_perm(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_ok(add_member(client, 'test_org', 'DEV_USER'))

    with dev_login(client, 'user'):
        assert_status(add_member(client, 'test_org', 'user0', is_admin=True), 403)


def test_remove_admin(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_ok(add_member(client, 'test_org', 'DEV_USER', is_admin=True))
        assert_ok(remove_member(client, 'test_org', 'DEV_USER'))


def test_remove_admin_no_perm(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_ok(add_member(client, 'test_org', 'DEV_USER'))

    with dev_login(client, 'user'):
        assert_status(remove_member(client, 'test_org', 'DEV_FACSTAFF'), 403)


def test_remove_last_admin(client, app):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'test_org'))
        assert_status(remove_member(client, 'test_org', 'DEV_FACSTAFF'), 400)


def test_list_orgs(client):
    with dev_login(client, 'facstaff'):
        assert_ok(create_org(client, 'org0'))
        assert_ok(add_member(client, 'org0', 'DEV_USER'))

        resp = client.get('/orgs/')
        assert_ok(resp)
        assert_in_resp(resp, 'org0')

        assert_ok(create_org(client, 'org1'))

        resp = client.get('/orgs/')
        assert_ok(resp)
        assert_in_resp(resp, 'org0')
        assert_in_resp(resp, 'org1')

    with dev_login(client, 'user'):
        resp = client.get('/orgs/')
        assert_ok(resp)
        assert_in_resp(resp, 'org0')
        with pytest.raises(AssertionError):
            assert_in_resp(resp, 'org1')
