import pytest

from fixtures import app, client, dev_login  # noqa: F401
from fixtures import dev_login
from assertions import assert_redirect, assert_status, assert_not_500, assert_ok


DEV_ROLES = ['user', 'facstaff', 'power', 'admin']


def test_index_logged_out(client):
    assert_redirect(client.get('/'), 'app')


@pytest.mark.parametrize('role', DEV_ROLES)
def test_index_dev_logins(client, role):
    with dev_login(client, role):
        assert_ok(client.get('/app/'))


@pytest.mark.parametrize('role', DEV_ROLES)
def test_dev_logins(client, role):
    try:
        assert_redirect(client.get(f'/app/devlogins/{role}'), '/')
    finally:
        assert_status(client.get('/app/logout'), 302)


def test_delete(client, app):
    assert_redirect(client.post('/app/delete'), 'shrunk-login')


# We need to use '/admin/' instead of '/admin' here, because
# '/admin' serves a 308 redirect to '/admin', which then serves
# a 302 redirect to '/shrunk-login'.
NO_500_ROUTES = [
    '/app/admin/', '/app/faq', '/app/stats', '/app/logout', '/app/stat/visits/daily',
    '/app/stat/geoip', '/app/stat/referer', '/app/stat/useragent', '/app/stat/csv/link',
    '/app/stat/csv/search', '/app/orgs/'
]


@pytest.mark.parametrize('route', NO_500_ROUTES)
def test_auth_no_500(client, route):
    assert_redirect(client.get(route), 'shrunk-login')
    with dev_login(client, 'user'):
        assert_not_500(client.get(route))


def test_normal_login(client):
    assert_ok(client.get('/app/shrunk-login'))
    with dev_login(client, 'user'):
        assert_redirect(client.get('/app/shrunk-login'), '/')


def test_admin_panel(client):
    with dev_login(client, 'admin'):
        assert_ok(client.get('/app/admin/'))


def test_404(client):
    assert_status(client.get('/abcdefg!@#$%'), 404)
