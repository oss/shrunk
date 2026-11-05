"""Production validation and explicit isolated development/test controls."""

import os
from pathlib import Path
import subprocess
import sys
from unittest.mock import Mock

import pytest

import shrunk

ENTRYPOINT = Path(__file__).resolve().parents[1] / "entrypoint.sh"


@pytest.fixture
def production(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in ("FLASK_ENV", "FLASK_DEBUG", "SHRUNK_DEV_LOGINS", "SHRUNK_FLASK_TESTING", "SHRUNK_SECRET_KEY"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("SHRUNK_SECRET_KEY", "0123456789abcdef" * 4)
    monkeypatch.setattr(shrunk, "_init_shrunk_client", Mock(side_effect=AssertionError("Unexpected database access")))


@pytest.mark.usefixtures("production")
@pytest.mark.parametrize(
    ("name", "value"),
    [
        ("SHRUNK_SECRET_KEY", None),
        ("SHRUNK_SECRET_KEY", ""),
        ("SHRUNK_SECRET_KEY", "something_secret"),
        ("SHRUNK_SECRET_KEY", "short-test-key"),
        ("SHRUNK_SECRET_KEY", " " * 64),
        ("SHRUNK_SECRET_KEY", " " * 20 + "something_secret" + " " * 20),
        ("SHRUNK_DEV_LOGINS", "1"),
        ("SHRUNK_DEV_LOGINS", "true"),
        ("SHRUNK_FLASK_TESTING", "yes"),
        ("FLASK_DEBUG", "true"),
        ("FLASK_DEBUG", "1"),
        ("FLASK_DEBUG", "TRUE"),
        ("FLASK_DEBUG", "unexpected"),
        ("FLASK_ENV", "prodution"),
    ],
)
def test_production_rejects_unsafe_settings(monkeypatch: pytest.MonkeyPatch, name: str, value: str | None) -> None:
    if value is None:
        monkeypatch.delenv(name)
    else:
        monkeypatch.setenv(name, value)
    with pytest.raises(ValueError, match="Production requires|must be"):
        shrunk.create_app()


@pytest.mark.usefixtures("production")
@pytest.mark.parametrize("debug", ["0", "false", "False", "no"])
def test_production_control(monkeypatch: pytest.MonkeyPatch, debug: str) -> None:
    monkeypatch.setenv("FLASK_DEBUG", debug)
    app = shrunk.create_app()
    assert not app.debug
    assert not app.testing
    assert "devlogins" not in app.blueprints
    assert not any("devlogins" in rule.rule for rule in app.url_map.iter_rules())
    assert app.test_client().get("/api/core/health").status_code == 200


@pytest.mark.usefixtures("production")
@pytest.mark.parametrize(("name", "value"), [("FLASK_ENV", "development"), ("SHRUNK_FLASK_TESTING", "1")])
def test_explicit_local_modes(monkeypatch: pytest.MonkeyPatch, name: str, value: str) -> None:
    monkeypatch.setenv(name, value)
    monkeypatch.setenv("SHRUNK_SECRET_KEY", "isolated-test-key")
    monkeypatch.setenv("SHRUNK_DEV_LOGINS", "1")
    app = shrunk.create_app()
    assert "devlogins" in app.blueprints
    assert app.test_client().get("/api/core/health").status_code == 200


@pytest.mark.usefixtures("production")
def test_entrypoint_rejects_before_migration(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    marker = tmp_path / "commands"
    wrapper = tmp_path / "python"
    wrapper.write_text(
        f'#!/bin/sh\nif [ "$1" = "-c" ]; then\n'
        f'  exec "{sys.executable}" "$@"\nfi\necho invoked >> "{marker}"\nexit 99\n'
    )
    wrapper.chmod(0o755)
    monkeypatch.setenv("PATH", f"{tmp_path}:{os.environ['PATH']}")
    monkeypatch.setenv("SHRUNK_DEV_LOGINS", "1")
    monkeypatch.setenv("SHRUNK_SEED_DATABASE", "1")
    result = subprocess.run(["sh", str(ENTRYPOINT)], capture_output=True, text=True, check=False)
    assert result.returncode != 0
    assert "Production requires SHRUNK_DEV_LOGINS=0" in result.stderr
    assert not marker.exists()


@pytest.mark.usefixtures("production")
def test_entrypoint_accepts_valid_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PATH", f"{Path(sys.executable).parent}:{os.environ['PATH']}")
    result = subprocess.run(["sh", str(ENTRYPOINT), "/bin/true"], capture_output=True, text=True, check=False)
    assert result.returncode == 0, result.stderr
