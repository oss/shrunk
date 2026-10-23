from types import SimpleNamespace

from flask import current_app
from pymongo.errors import ServerSelectionTimeoutError

import shrunk


def test_health_and_ready_without_login_or_database(monkeypatch):
    monkeypatch.setenv("SHRUNK_SECRET_KEY", "test")
    monkeypatch.setattr(shrunk, "_init_logging", lambda: None)

    state = {"init_down": True, "ping_down": False, "initializations": 0, "pings": 0}
    visits = []

    def ping(command):
        assert command == "ping"
        state["pings"] += 1
        if state["ping_down"]:
            raise ServerSelectionTimeoutError("MongoDB unavailable")

    def initialize():
        state["initializations"] += 1
        if state["init_down"]:
            raise ServerSelectionTimeoutError("MongoDB unavailable")
        current_app.client = SimpleNamespace(
            db=SimpleNamespace(command=ping),
            record_visit=lambda netid, endpoint: visits.append((netid, endpoint)),
        )

    monkeypatch.setattr(shrunk, "_init_shrunk_client", initialize)
    monkeypatch.setattr(shrunk, "_init_roles", lambda: None)

    app = shrunk.create_app()
    with app.test_client() as client:
        assert client.get("/api/core/health").status_code == 200
        assert state["initializations"] == 0
        assert client.get("/api/core/ready").status_code == 503
        assert state["initializations"] == 1

        state["init_down"] = False
        assert client.get("/api/core/ready").status_code == 200
        state["ping_down"] = True
        assert client.get("/api/core/ready").status_code == 503
        assert client.get("/api/core/health").status_code == 200
        assert not visits

        assert client.get("/api/core/enabled").status_code == 200
        assert visits == [(None, "get_features_flag")]

    state["init_down"] = True
    assert shrunk.create_app().test_client().get("/api/core/ready").status_code == 503
