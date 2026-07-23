"""Applies pending database migrations.

Invoked once from ``entrypoint.sh`` before the app server starts. Multi-replica
deployments can start several backend pods at once during a rollout, so
migrations are also guarded by a Mongo-based lock to keep concurrent startups
from applying the same migration twice at once.
"""

import logging
import os
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pymongo
from pymongo.errors import DuplicateKeyError
from pymongo_migrate.mongo_migrate import MongoMigrate  # type: ignore[import-untyped]

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

LOCK_COLLECTION = "migration_locks"
LOCK_ID = "migration_lock"
LOCK_STALE_AFTER = timedelta(minutes=60)
LOCK_WAIT_TIMEOUT = timedelta(minutes=10)
LOCK_POLL_INTERVAL_SECONDS = 1.0


class MigrationLockTimeout(RuntimeError):
    """Raised when another process holds the migration lock for too long."""


def _make_client() -> pymongo.MongoClient:
    db_port = os.getenv("SHRUNK_DB_PORT")
    assert db_port is not None, "SHRUNK_DB_PORT must be set"

    return pymongo.MongoClient(
        os.getenv("SHRUNK_DB_HOST"),
        int(db_port),
        replicaSet=os.getenv("SHRUNK_REPLICA_SET_NAME"),
        directConnection=False,
        authSource="admin",
        tz_aware=True,
    )


def _acquire_lock(lock_collection: pymongo.collection.Collection) -> None:
    """Block until this process is the sole holder of the migration lock.

    Mongo's default unique `_id` index makes the insert an atomic
    compare-and-set: exactly one concurrent caller can insert the lock
    document, so this doubles as a mutex without needing a separate unique
    index. A stale lock (holder crashed without releasing) is reclaimed
    after ``LOCK_STALE_AFTER``.
    """
    deadline = time.monotonic() + LOCK_WAIT_TIMEOUT.total_seconds()
    while True:
        now = datetime.now(timezone.utc)
        try:
            lock_collection.insert_one({"_id": LOCK_ID, "acquired_at": now})
            return
        except DuplicateKeyError:
            pass

        existing = lock_collection.find_one({"_id": LOCK_ID})
        if existing is not None and now - existing["acquired_at"] > LOCK_STALE_AFTER:
            # Previous holder crashed/was killed without releasing the lock.
            # Delete conditioned on the timestamp we just read, so we don't
            # clobber a legitimate lock acquired concurrently by someone else.
            lock_collection.delete_one({"_id": LOCK_ID, "acquired_at": existing["acquired_at"]})
            continue

        if time.monotonic() >= deadline:
            raise MigrationLockTimeout(f"Timed out after {LOCK_WAIT_TIMEOUT} waiting for lock.")
        time.sleep(LOCK_POLL_INTERVAL_SECONDS)


def _release_lock(lock_collection: pymongo.collection.Collection) -> None:
    lock_collection.delete_one({"_id": LOCK_ID})


def run_migrations() -> None:
    """Run all pending migrations under a Mongo-backed process lock."""
    db_name = os.getenv("SHRUNK_DB_NAME")
    assert db_name is not None, "SHRUNK_DB_NAME must be set"

    client = _make_client()
    try:
        lock_collection = client[db_name][LOCK_COLLECTION]
        _acquire_lock(lock_collection)
        try:
            migrator = MongoMigrate(
                client=client,
                database=db_name,
                migrations_dir=str(MIGRATIONS_DIR),
            )
            migrator.upgrade()
        finally:
            _release_lock(lock_collection)
    finally:
        client.close()


if __name__ == "__main__":
    logging_format = os.getenv("SHRUNK_LOG_FORMAT") or "[%(asctime)s] %(levelname)s: %(message)s"
    logging.basicConfig(level=logging.INFO, format=logging_format)
    run_migrations()
