from werkzeug.test import Client
import os


def test_motd(client: Client) -> None:
    resp = client.get("/api/v1/motd")
    assert resp.status_code == 200
    assert resp.text == os.getenv("SHRUNK_MOTD")
