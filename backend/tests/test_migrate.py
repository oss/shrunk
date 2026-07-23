"""Tests for automatic Mongo migrations."""
# pylint: disable=missing-function-docstring

import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Generator

import pytest

from shrunk import migrate
from shrunk.client import ShrunkClient

MIGRATION_MODULE = """
name = "0001_test_migration"
dependencies = []


def upgrade(db):
    db.migration_smoke_test.insert_one({"marker": "upgraded"})


def downgrade(db):
    db.migration_smoke_test.delete_many({})
"""

SLOW_MIGRATION_MODULE = """
import time

name = "0001_slow_migration"
dependencies = []


def upgrade(db):
    db.migration_smoke_test.insert_one({"marker": "start"})
    time.sleep(0.5)
    db.migration_smoke_test.insert_one({"marker": "end"})


def downgrade(db):
    db.migration_smoke_test.delete_many({})
"""


@pytest.fixture
def temp_migrations_dir(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Path:
    (tmp_path / "0001_test_migration.py").write_text(MIGRATION_MODULE)
    monkeypatch.setattr(migrate, "MIGRATIONS_DIR", tmp_path)
    return tmp_path


@pytest.fixture(autouse=True)
def cleanup_migration_state(
    db: ShrunkClient,  # pylint: disable=redefined-outer-name
) -> Generator[None, None, None]:
    try:
        yield
    finally:
        db.db.migration_smoke_test.delete_many({})
        db.db.pymongo_migrate.delete_many({})
        db.db.migration_locks.delete_many({})


def test_run_migrations_applies_pending_migrations(
    db: ShrunkClient,  # pylint: disable=redefined-outer-name
    temp_migrations_dir: Path,  # pylint: disable=unused-argument,redefined-outer-name
) -> None:
    migrate.run_migrations()

    assert db.db.migration_smoke_test.count_documents({}) == 1
    state = db.db.pymongo_migrate.find_one({"name": "0001_test_migration"})
    assert state is not None
    assert state["applied"] is not None


def test_run_migrations_is_idempotent(
    db: ShrunkClient,  # pylint: disable=redefined-outer-name
    temp_migrations_dir: Path,  # pylint: disable=unused-argument,redefined-outer-name
) -> None:
    migrate.run_migrations()
    migrate.run_migrations()

    assert db.db.migration_smoke_test.count_documents({}) == 1


def test_run_migrations_serializes_concurrent_callers(
    db: ShrunkClient,  # pylint: disable=redefined-outer-name
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Simulates two backend pods restarting at once:
    only one caller should actually run the migration body; the other must
    block on the lock and then observe it as already applied."""
    (tmp_path / "0001_slow_migration.py").write_text(SLOW_MIGRATION_MODULE)
    monkeypatch.setattr(migrate, "MIGRATIONS_DIR", tmp_path)

    errors: list[BaseException] = []

    def call_run_migrations() -> None:
        try:
            migrate.run_migrations()
        except BaseException as exc:  # pylint: disable=broad-exception-caught
            errors.append(exc)

    threads = [threading.Thread(target=call_run_migrations) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=10)

    assert not errors, f"run_migrations raised in a thread: {errors}"
    markers = [doc["marker"] for doc in db.db.migration_smoke_test.find({}, sort=[("_id", 1)])]
    assert markers == ["start", "end"], f"migration body ran more than once: {markers}"
    assert db.db.migration_locks.count_documents({}) == 0


def test_run_migrations_reclaims_stale_lock(
    db: ShrunkClient,  # pylint: disable=redefined-outer-name
    temp_migrations_dir: Path,  # pylint: disable=unused-argument,redefined-outer-name
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(migrate, "LOCK_STALE_AFTER", timedelta(seconds=0))
    db.db.migration_locks.insert_one(
        {"_id": migrate.LOCK_ID, "acquired_at": datetime.now(timezone.utc) - timedelta(minutes=30)}
    )

    migrate.run_migrations()

    assert db.db.migration_smoke_test.count_documents({}) == 1
    assert db.db.migration_locks.count_documents({}) == 0


def test_run_migrations_times_out_on_held_lock(
    db: ShrunkClient,  # pylint: disable=redefined-outer-name
    temp_migrations_dir: Path,  # pylint: disable=unused-argument,redefined-outer-name
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(migrate, "LOCK_WAIT_TIMEOUT", timedelta(seconds=1))
    monkeypatch.setattr(migrate, "LOCK_POLL_INTERVAL_SECONDS", 0.1)
    held_lock = {"_id": migrate.LOCK_ID, "acquired_at": datetime.now(timezone.utc)}
    db.db.migration_locks.insert_one(held_lock)

    start = time.monotonic()
    with pytest.raises(migrate.MigrationLockTimeout):
        migrate.run_migrations()
    elapsed = time.monotonic() - start

    assert elapsed < 5, f"timeout took too long: {elapsed}s"
    assert db.db.migration_smoke_test.count_documents({}) == 0
