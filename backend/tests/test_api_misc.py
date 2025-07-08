from werkzeug.test import Client
import os


def test_motd(client: Client) -> None:
    resp = client.get("/api/core/motd")
    assert resp.status_code == 200
    assert resp.get_data(as_text=True) == os.getenv("SHRUNK_MOTD")
