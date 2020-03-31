import pytest

import shrunk


def pytest_configure(config):
    config.addinivalue_line('markers', 'slow: mark the test as slow')


@pytest.fixture(scope='session')
def app():
    app = shrunk.create_app(config_path='../shrunk/test-config.py')
    with app.test_client() as client:
        # Force ShrunkFlask to initialize the database connection, since that
        # initialization is deferred until the first request.
        client.get('/')
    yield app
    app.get_shrunk().drop_database()


@pytest.fixture()
def db(app):
    db = app.get_shrunk()
    yield db
    db.reset_database()


@pytest.fixture()
def client(app):
    with app.test_client() as client:
        yield client
    app.get_shrunk().reset_database()
