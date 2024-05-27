import os
from typing import Any, Generator

import pytest
from flask import Flask
from werkzeug.test import Client

import shrunk
from shrunk.client import ShrunkClient


def pytest_configure(config: Any) -> None:
    config.addinivalue_line("markers", "slow: mark the test as slow")


@pytest.fixture(scope="session")
def app() -> Flask:
    config_path = os.getenv("SHRUNK_CONFIG_PATH")
    if config_path is None:
        config_path = "./local-test-config.py"
    shrunk_app: Flask = shrunk.create_app(config_path=config_path)
    with shrunk_app.test_client() as test_client:
        # Force the app to initialize the database connection, since that
        # initialization is deferred until the first request.
        test_client.get("/")
    return shrunk_app


@pytest.fixture
def db(
    app: Flask,
) -> Generator[ShrunkClient, None, None]:  # pylint: disable=redefined-outer-name
    shrunk_db = app.client
    shrunk_db.reset_database()
    try:
        yield shrunk_db
    finally:
        shrunk_db.reset_database()


@pytest.fixture
def client(
    app: Flask,
) -> Generator[Client, None, None]:  # pylint: disable=redefined-outer-name
    with app.test_client() as test_client:
        app.client.reset_database()
        try:
            yield test_client
        finally:
            app.client.reset_database()
