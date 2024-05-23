import base64
import pytest
from werkzeug.test import Client
from flask import Flask
from flask.testing import FlaskClient as Client
from util import dev_login
import os
import shrunk


@pytest.fixture(scope="session")
def app() -> Flask:
    """
    Creates and returns a Flask application instance.

    This function initializes a Flask application using the provided configuration path.
    If the environment variable 'SHRUNK_CONFIG_PATH' is not set, it defaults to './local-test-config.py'.
    The function also forces the application to initialize the database connection by making a test request to the root URL.

    Returns:
        Flask: The initialized Flask application instance.
    """
    config_path = os.getenv("SHRUNK_CONFIG_PATH")
    if config_path is None:
        config_path = "./config.py"
    shrunk_app: Flask = shrunk.create_app(config_path=config_path)
    with shrunk_app.test_client() as test_client:
        # Force the app to initialize the database connection, since that
        # initialization is deferred until the first request.
        test_client.get("/")
    return shrunk_app


@pytest.mark.parametrize("user", ["admin"])
def test_query_position_info(app: Flask, client: Client, user: str) -> None:
    """
    Test function to query position information. This test is skipped if LDAP is not enabled. Additionally, the test will always fail if not connected to the Rutgers network.

    Args:
        app (Flask): The Flask application object.
        client (Client): The Flask test client object.
        user (str): The user to perform the test as.

    Returns:
        None

    Raises:
        AssertionError: If the response status code is not 200 or if the 'uid' field is not 'jcc'.
    """
    with app.app_context():
        if not app.config["LDAP_VALIDATE_NETIDS"]:
            pytest.skip("LDAP not enabled")

        with dev_login(client, user):
            encodedEntity = base64.b32encode("jcc".encode()).decode()
            resp = client.get(f"/api/v1/position/{encodedEntity}")
            assert resp.status_code == 200, "Failed to query position info"

            # Get the JSON response data
            data = resp.get_json()

            # Assert that the 'uid' field is 'jcc'
            assert data["uid"][0] == "jcc", "uid is not 'jcc'"
