import contextlib

import pytest

import shrunk

from assertions import assert_status


@pytest.fixture(scope='session')
def app():
    app = shrunk.create_app(DB_NAME='shrunk_test', DISABLE_CSRF_PROTECTION=True, TESTING=True)
    with app.test_client() as client:
        # Force ShrunkFlask to initialize the database connection, since that
        # initialization is deferred until the first request.
        client.get('/')
    yield app
    app.get_shrunk().drop_database()


@pytest.fixture
def db(app):
    db = app.get_shrunk()
    yield db
    db.reset_database()


@pytest.fixture
def client(app):
    with app.test_client() as client:
        yield client
    app.get_shrunk().reset_database()


@contextlib.contextmanager
def dev_login(client, dev_login):
    assert_status(client.get(f'/devlogins/{dev_login}'), 302)
    try:
        yield
    finally:
        assert_status(client.get('/logout'), 302)


@contextlib.contextmanager
def set_geoip(db, geoip):
    old_geoip = db._geoip
    db._geoip = geoip
    try:
        yield
    finally:
        db._geoip = old_geoip
