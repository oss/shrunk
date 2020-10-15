import contextlib


def assert_redirect(resp, location_pat):
    assert resp.status_code == 302
    assert location_pat in resp.headers['Location']


def assert_status(resp, status):
    assert resp.status_code == status


def assert_ok(resp):
    assert_status(resp, 200)


def assert_not_500(resp):
    assert resp.status_code < 500


def assert_in_resp(resp, string):
    assert string in str(resp.get_data(), 'utf8')


def assert_json(resp, expected):
    assert resp.get_json() == expected


@contextlib.contextmanager
def dev_login(client, dev_login):
    assert_status(client.get(f'/app/devlogins/{dev_login}'), 302)
    try:
        yield
    finally:
        assert_status(client.get('/app/logout'), 302)
